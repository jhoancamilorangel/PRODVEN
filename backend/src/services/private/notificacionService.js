const Notificacion = require('../../models/Notificacion');
const logger = require('../../config/logger');

/**
 * Servicio de Notificaciones (parte de base de datos)
 *
 * Maneja las notificaciones dentro de la app:
 *  - Crear notificación (función interna que otros módulos llaman)
 *  - Listar las notificaciones de un usuario
 *  - Marcar como leída(s)
 *  - Contar no leídas
 *
 * El envío push real (Firebase) se hará en la Fase 18 con la app móvil,
 * usando la tabla notificaciones_push. Por ahora, el canal es "sistema"
 * (la notificación que el usuario ve dentro de la aplicación).
 */

// =====================================================
// CREAR NOTIFICACIÓN (uso interno)
// =====================================================

/**
 * Crea una notificación para un usuario.
 *
 * Pensada para ser llamada por otros servicios cuando ocurre un evento
 * (ej: al confirmarse un pedido, al recibir un pago, etc.).
 *
 * @param {object} datos - { idUsuario, idEmpresa, titulo, mensaje, tipo, urlAccion }
 * @returns {Promise<object>} La notificación creada
 */
const crearNotificacion = async (datos) => {
    try {
        const notificacion = await Notificacion.create({
            idUsuario: datos.idUsuario,
            idEmpresa: datos.idEmpresa || null,
            titulo: datos.titulo,
            mensaje: datos.mensaje,
            tipo: datos.tipo || 'sistema',
            canal: datos.canal || 'sistema',
            leida: false,
            urlAccion: datos.urlAccion || null
        });

        logger.info(`Notificación creada para usuario ${datos.idUsuario}: ${datos.titulo}`);

        return notificacion.datosCompletos();
    } catch (error) {
        // Una notificación que falla no debe tumbar la operación principal que la origina
        logger.error(`Error al crear notificación: ${error.message}`);
        return null;
    }
};

// =====================================================
// CONSULTAR
// =====================================================

/**
 * Lista las notificaciones de un usuario
 */
const listarNotificaciones = async (idUsuario, filtros = {}) => {
    const where = { idUsuario };

    // Filtro opcional: solo no leídas
    if (filtros.soloNoLeidas === 'true' || filtros.soloNoLeidas === true) {
        where.leida = false;
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 20;
    const offset = (pagina - 1) * limit;

    const { count, rows } = await Notificacion.findAndCountAll({
        where,
        order: [['fecha_envio', 'DESC']],
        limit,
        offset
    });

    return {
        notificaciones: rows.map(n => n.datosCompletos()),
        paginacion: {
            total: count,
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

/**
 * Cuenta las notificaciones no leídas de un usuario (para el badge)
 */
const contarNoLeidas = async (idUsuario) => {
    const total = await Notificacion.count({
        where: { idUsuario, leida: false }
    });

    return { noLeidas: total };
};

// =====================================================
// MARCAR LEÍDAS
// =====================================================

/**
 * Marca una notificación específica como leída
 */
const marcarLeida = async (idNotificacion, idUsuario) => {
    const notificacion = await Notificacion.findOne({
        where: { idNotificacion, idUsuario }
    });

    if (!notificacion) {
        return { exito: false, mensaje: 'Notificación no encontrada' };
    }

    notificacion.leida = true;
    await notificacion.save();

    return { exito: true, mensaje: 'Notificación marcada como leída' };
};

/**
 * Marca TODAS las notificaciones del usuario como leídas
 */
const marcarTodasLeidas = async (idUsuario) => {
    const [afectadas] = await Notificacion.update(
        { leida: true },
        { where: { idUsuario, leida: false } }
    );

    return { exito: true, marcadas: afectadas, mensaje: `${afectadas} notificaciones marcadas como leídas` };
};

module.exports = {
    crearNotificacion,
    listarNotificaciones,
    contarNoLeidas,
    marcarLeida,
    marcarTodasLeidas
};