const SolicitudNegocio = require('../../models/SolicitudNegocio');
const Usuario = require('../../models/Usuario');
const empresaService = require('../shared/empresaService');
const notificacionEventos = require('./notificacionEventos');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Solicitudes de Negocio (onboarding de vendedores)
 *
 * Maneja el ciclo completo de una solicitud para convertirse en negocio:
 *  - Crear la solicitud (cliente)
 *  - Listar pendientes (superadmin)
 *  - Aprobar: crea la empresa real, promueve al usuario a 'administrador'
 *    y lo vincula a esa empresa.
 *  - Rechazar: guarda motivo, el usuario sigue siendo cliente.
 *
 * Regla clave: al aprobar, el usuario deja de ser cliente y pasa a ser
 * administrador de su propia empresa. Como los permisos son automáticos
 * por rol (config/permisos.js), el solo cambio de 'rol' le da acceso
 * completo a su panel sin pasos extra.
 */

// =====================================================
// CREAR SOLICITUD (cliente)
// =====================================================

/**
 * Crea una solicitud de negocio para un usuario cliente.
 *
 * @param {string} idUsuario - Usuario que solicita
 * @param {object} datos - { nombreNegocio, categoria, telefono, ciudad, departamento, descripcion }
 * @returns {Promise<object>} { exito, solicitud, mensaje }
 */
const crearSolicitud = async (idUsuario, datos = {}) => {
    // Cargar el usuario para validar su estado
    const usuario = await Usuario.findByPk(idUsuario);
    if (!usuario) {
        return { exito: false, mensaje: 'Usuario no encontrado' };
    }

    // Solo un cliente puede solicitar convertirse en negocio
    if (usuario.rol !== 'cliente') {
        return { exito: false, mensaje: 'Tu cuenta ya es una cuenta de negocio o interna.' };
    }

    // No permitir una segunda solicitud si ya hay una pendiente
    const pendienteExistente = await SolicitudNegocio.findOne({
        where: { idUsuario, estado: 'pendiente' }
    });
    if (pendienteExistente) {
        return {
            exito: false,
            mensaje: 'Ya tienes una solicitud en revisión. Espera a que sea procesada.'
        };
    }

    if (!datos.nombreNegocio || datos.nombreNegocio.trim().length < 2) {
        return { exito: false, mensaje: 'El nombre del negocio es obligatorio.' };
    }

    const solicitud = await SolicitudNegocio.create({
        idUsuario,
        nombreNegocio: datos.nombreNegocio.trim(),
        categoria: datos.categoria || null,
        telefono: datos.telefono || null,
        ciudad: datos.ciudad || null,
        departamento: datos.departamento || null,
        descripcion: datos.descripcion || null,
        estado: 'pendiente'
    });

    logger.info(`Solicitud de negocio creada: ${solicitud.idSolicitud} por usuario ${idUsuario}`);

    return {
        exito: true,
        solicitud: solicitud.datosCompletos(),
        mensaje: 'Tu solicitud fue enviada. El equipo de ProdVen la revisará pronto.'
    };
};

// =====================================================
// CONSULTAR (superadmin)
// =====================================================

/**
 * Lista solicitudes, opcionalmente filtradas por estado.
 * Incluye datos básicos del usuario solicitante.
 */
const listarSolicitudes = async (filtros = {}) => {
    const where = {};
    if (filtros.estado) {
        where.estado = filtros.estado;
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 20;
    const offset = (pagina - 1) * limit;

    const { count, rows } = await SolicitudNegocio.findAndCountAll({
        where,
        order: [['fecha_creacion', 'DESC']],
        limit,
        offset
    });

    // Enriquecer cada solicitud con datos del solicitante
    const solicitudes = [];
    for (const s of rows) {
        const usuario = await Usuario.findByPk(s.idUsuario);
        solicitudes.push({
            ...s.datosCompletos(),
            solicitante: usuario
                ? {
                    nombres: usuario.nombres,
                    apellidos: usuario.apellidos,
                    correo: usuario.correo,
                    telefono: usuario.telefono
                }
                : null
        });
    }

    return {
        solicitudes,
        paginacion: {
            total: count,
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

/**
 * Cuenta las solicitudes pendientes (para el badge del panel superadmin).
 */
const contarPendientes = async () => {
    const total = await SolicitudNegocio.count({ where: { estado: 'pendiente' } });
    return { pendientes: total };
};

// =====================================================
// APROBAR (superadmin) — el corazón del onboarding
// =====================================================

/**
 * Aprueba una solicitud: crea la empresa real, promueve al usuario a
 * administrador y lo vincula a la empresa. Todo en una transacción para
 * no dejar datos a medias.
 *
 * @param {string} idSolicitud - Solicitud a aprobar
 * @param {string} idSuperAdmin - SuperAdmin que aprueba
 * @returns {Promise<object>} { exito, mensaje, idEmpresa }
 */
const aprobarSolicitud = async (idSolicitud, idSuperAdmin) => {
    const solicitud = await SolicitudNegocio.findByPk(idSolicitud);

    if (!solicitud) {
        return { exito: false, mensaje: 'Solicitud no encontrada' };
    }

    if (solicitud.estado !== 'pendiente') {
        return { exito: false, mensaje: `La solicitud ya fue ${solicitud.estado}.` };
    }

    const usuario = await Usuario.findByPk(solicitud.idUsuario);
    if (!usuario) {
        return { exito: false, mensaje: 'El usuario solicitante ya no existe.' };
    }

    // Si el usuario dejó de ser cliente entre solicitud y aprobación, abortar
    if (usuario.rol !== 'cliente') {
        return { exito: false, mensaje: 'El usuario ya no es un cliente; no se puede convertir.' };
    }

    // 1. Crear la empresa real reutilizando el service existente
    //    (crea empresa + suscripción + configuración + bodega principal).
    //    Nace en 'pendiente_verificacion'; la activamos a continuación.
    let empresaCreada;
    try {
        const resultado = await empresaService.crearEmpresaCompleta(
            {
                nombre: solicitud.nombreNegocio,
                correo: usuario.correo, // correo de contacto de la empresa = correo del dueño
                categoria: solicitud.categoria,
                telefono: solicitud.telefono,
                ciudad: solicitud.ciudad,
                departamento: solicitud.departamento,
                descripcion: solicitud.descripcion
            },
            'premium',
            idSuperAdmin,
            { diasPruebaPersonalizado: 30 }
        );
        empresaCreada = resultado.empresa;
    } catch (error) {
        logger.error(`Error al crear empresa en aprobación: ${error.message}`);
        return { exito: false, mensaje: 'No se pudo crear la empresa. Revisa los datos e intenta de nuevo.' };
    }

    // 2. Activar la empresa (queda operativa, aún en modo privado)
    try {
        await empresaService.activarEmpresa(empresaCreada.idEmpresa);
    } catch (error) {
        logger.error(`Error al activar empresa en aprobación: ${error.message}`);
        // No abortamos: la empresa existe, el superadmin puede activarla manualmente si hiciera falta
    }

    // 3. Promover al usuario a administrador y vincularlo a su empresa,
    //    y marcar la solicitud como aprobada — en una transacción.
    const transaction = await sequelize.transaction();
    try {
        usuario.rol = 'administrador';
        usuario.idEmpresa = empresaCreada.idEmpresa;
        await usuario.save({ transaction });

        solicitud.estado = 'aprobada';
        solicitud.idEmpresaCreada = empresaCreada.idEmpresa;
        solicitud.revisadaPor = idSuperAdmin;
        solicitud.fechaRevision = new Date();
        await solicitud.save({ transaction });

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al promover usuario en aprobación: ${error.message}`);
        return { exito: false, mensaje: 'La empresa se creó pero no se pudo asignar el administrador. Contacta soporte.' };
    }

    // 4. Cerrar las sesiones activas del usuario: su rol cambió, así que
    //    debe volver a iniciar sesión para recibir un token con el rol nuevo.
    try {
        await require('../shared/authService').revocarTodosLosTokens(usuario.idUsuario);
    } catch (error) {
        logger.error(`Error al revocar tokens tras aprobación: ${error.message}`);
    }

    // 5. Notificar al usuario que su solicitud fue aprobada (fire-and-forget)
    await notificacionEventos.notificarSolicitudAprobada(usuario.idUsuario, solicitud.nombreNegocio);

    logger.info(`Solicitud ${idSolicitud} aprobada. Usuario ${usuario.idUsuario} ahora es administrador de ${empresaCreada.idEmpresa}`);

    return {
        exito: true,
        mensaje: 'Solicitud aprobada. El usuario ahora es administrador de su negocio.',
        idEmpresa: empresaCreada.idEmpresa
    };
};

// =====================================================
// RECHAZAR (superadmin)
// =====================================================

/**
 * Rechaza una solicitud con un motivo. El usuario sigue siendo cliente.
 *
 * @param {string} idSolicitud - Solicitud a rechazar
 * @param {string} motivo - Razón del rechazo
 * @param {string} idSuperAdmin - SuperAdmin que rechaza
 * @returns {Promise<object>} { exito, mensaje }
 */
const rechazarSolicitud = async (idSolicitud, motivo, idSuperAdmin) => {
    const solicitud = await SolicitudNegocio.findByPk(idSolicitud);

    if (!solicitud) {
        return { exito: false, mensaje: 'Solicitud no encontrada' };
    }

    if (solicitud.estado !== 'pendiente') {
        return { exito: false, mensaje: `La solicitud ya fue ${solicitud.estado}.` };
    }

    if (!motivo || motivo.trim().length < 5) {
        return { exito: false, mensaje: 'Debes dar un motivo de rechazo (mínimo 5 caracteres).' };
    }

    solicitud.estado = 'rechazada';
    solicitud.motivoRechazo = motivo.trim();
    solicitud.revisadaPor = idSuperAdmin;
    solicitud.fechaRevision = new Date();
    await solicitud.save();

    // Notificar al usuario del rechazo con el motivo (fire-and-forget)
    await notificacionEventos.notificarSolicitudRechazada(solicitud.idUsuario, motivo.trim());

    logger.info(`Solicitud ${idSolicitud} rechazada por ${idSuperAdmin}`);

    return { exito: true, mensaje: 'Solicitud rechazada. Se notificó al usuario.' };
};

module.exports = {
    crearSolicitud,
    listarSolicitudes,
    contarPendientes,
    aprobarSolicitud,
    rechazarSolicitud
};