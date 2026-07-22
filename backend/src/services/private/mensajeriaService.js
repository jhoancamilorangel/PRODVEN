const Conversacion = require('../../models/Conversacion');
const ParticipanteConversacion = require('../../models/ParticipanteConversacion');
const Mensaje = require('../../models/Mensaje');
const Usuario = require('../../models/Usuario');
const notificacionService = require('./notificacionService');
const { obtenerIO } = require('../../config/socket');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');
const { Op } = require('sequelize');

// =====================================================
// CONVERSACIONES
// =====================================================

const crearConversacion = async (idEmpresa, datos, idCreador) => {
    const transaction = await sequelize.transaction();

    try {
        const participantes = [];
        const tipo = datos.tipo || 'cliente';
        // Soporte SIEMPRE es global, sin importar si el creador tiene una
        // empresa asociada (req.tenantId). Antes se colaba la empresa del
        // creador aquí, rompiendo la idea de "un solo canal de soporte".
        const idEmpresaFinal = tipo === 'soporte' ? null : idEmpresa;
        const asunto = datos.asunto || (tipo === 'soporte' ? 'Soporte ProdVen' : null);
        const creadorIncluido = participantes.some(p => p.idUsuario === idCreador);
        if (!creadorIncluido) {
            participantes.push({ idUsuario: idCreador, rol: datos.rolCreador || 'cliente' });
        }

        if (tipo === 'cliente') {
            const personalTienda = await Usuario.findAll({
                where: {
                    idEmpresa,
                    rol: { [Op.in]: ['administrador', 'vendedor'] },
                    activo: true,
                    eliminado: false
                },
                attributes: ['idUsuario'],
                transaction
            });

            personalTienda.forEach((u) => {
                const yaIncluido = participantes.some(p => p.idUsuario === u.idUsuario);
                if (!yaIncluido) {
                    participantes.push({ idUsuario: u.idUsuario, rol: 'vendedor' });
                }
            });
        }

        // Soporte: se auto-agrega a TODOS los superadmin (por rol, no por
        // persona), sin filtrar por empresa. Cualquier usuario que tenga
        // rol=superadmin en la BD ve y puede responder cualquier ticket.
        if (tipo === 'soporte') {
            const superadmins = await Usuario.findAll({
                where: { rol: 'superadmin', activo: true, eliminado: false },
                attributes: ['idUsuario'],
                transaction
            });

            superadmins.forEach((u) => {
                const yaIncluido = participantes.some(p => p.idUsuario === u.idUsuario);
                if (!yaIncluido) {
                    participantes.push({ idUsuario: u.idUsuario, rol: 'superadmin' });
                }
            });
        }

        // Para soporte, buscamos por el creador siendo participante con un
        // rol distinto de superadmin — así nunca "reutilizamos" por error
        // uno de los tickets huérfanos que un superadmin pudo haber creado
        // sobre sí mismo, y siempre encontramos el ticket real de esa persona.
        const whereParticipante = tipo === 'soporte'
            ? { idUsuario: idCreador, rol: { [Op.ne]: 'superadmin' } }
            : { idUsuario: idCreador };

        const conversacionExistente = await Conversacion.findOne({
            where: {
                idEmpresa: idEmpresaFinal,
                tipo,
                estado: 'activa',
                asunto
            },
            include: [
                {
                    model: ParticipanteConversacion,
                    as: 'participantes',
                    where: whereParticipante,
                    required: true
                }
            ],
            transaction
        });

        if (conversacionExistente) {
            await transaction.commit();
            return {
                exito: true,
                conversacion: conversacionExistente.datosCompletos(),
                mensaje: 'Conversación existente reutilizada'
            };
        }

        const conversacion = await Conversacion.create({
            idEmpresa: idEmpresaFinal,
            tipo,
            asunto,
            estado: 'activa'
        }, { transaction });

        for (const part of participantes) {
            await ParticipanteConversacion.create({
                idConversacion: conversacion.idConversacion,
                idUsuario: part.idUsuario,
                rol: part.rol || 'cliente',
                fechaUltimoVisto: null
            }, { transaction });
        }

        await transaction.commit();

        logger.info(`Conversación creada: ${conversacion.idConversacion} (tipo: ${tipo})`);

        return {
            exito: true,
            conversacion: conversacion.datosCompletos(),
            mensaje: 'Conversación creada'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear conversación: ${error.message}`);
        throw error;
    }
};

const esParticipante = async (idConversacion, idUsuario) => {
    const participante = await ParticipanteConversacion.findOne({
        where: { idConversacion, idUsuario }
    });
    return participante !== null;
};

/**
 * @param {string} idUsuario
 * @param {object} filtros - { idEmpresa, tipo } ambos opcionales. Sin
 *   idEmpresa: no filtra por empresa (necesario para soporte, donde la
 *   conversación no pertenece a ninguna). Sin tipo: trae todos los tipos.
 */
const listarConversacionesUsuario = async (idUsuario, filtros = {}) => {
    const { idEmpresa, tipo } = filtros;

    const participaciones = await ParticipanteConversacion.findAll({
        where: { idUsuario }
    });

    const idsConversaciones = participaciones.map(p => p.idConversacion);

    if (idsConversaciones.length === 0) {
        return { conversaciones: [] };
    }

    const whereConversacion = {
        idConversacion: { [Op.in]: idsConversaciones },
        estado: 'activa'
    };
    if (idEmpresa) whereConversacion.idEmpresa = idEmpresa;
    if (tipo) whereConversacion.tipo = tipo;

    const conversaciones = await Conversacion.findAll({
        where: whereConversacion,
        order: [['fechaUltimoMensaje', 'DESC']]
    });

    const participacionMap = new Map(
        participaciones.map(p => [p.idConversacion, p])
    );

    const conversacionesEnriquecidas = await Promise.all(
        conversaciones.map(async (c) => {
            const part = participacionMap.get(c.idConversacion);

            const noLeidos = await Mensaje.count({
                where: {
                    idConversacion: c.idConversacion,
                    idRemitente: { [Op.ne]: idUsuario },
                    leido: false
                }
            });

            // Solo para soporte: identifica quién es el solicitante (el
            // participante que NO es el usuario actual), para que el
            // panel de superadmin nunca muestre mensajes sin saber de
            // quién vienen.
            // Identifica al "otro lado" de la conversación con datos reales
            // de la BD, en vez de parsear el campo asunto (que en 'cliente'
            // guarda el nombre de la TIENDA, no del cliente que escribe).
            let solicitante = null;
            if (c.tipo === 'soporte') {
                const otroParticipante = await ParticipanteConversacion.findOne({
                    where: { idConversacion: c.idConversacion, rol: { [Op.ne]: 'superadmin' } }
                }); 

                if (otroParticipante) {
                    const usuarioSolicitante = await Usuario.findByPk(otroParticipante.idUsuario, {
                        attributes: ['idUsuario', 'nombres', 'apellidos', 'correo', 'rol']
                    });
                    if (usuarioSolicitante) {
                        solicitante = {
                            idUsuario: usuarioSolicitante.idUsuario,
                            nombres: usuarioSolicitante.nombres,
                            apellidos: usuarioSolicitante.apellidos,
                            correo: usuarioSolicitante.correo,
                            rol: usuarioSolicitante.rol
                        };
                    }
                }
            
            } else if (c.tipo === 'cliente') {
                const otroParticipante = await ParticipanteConversacion.findOne({
                    where: { idConversacion: c.idConversacion, rol: 'cliente' }
                });
                if (otroParticipante) {
                    const usuarioSolicitante = await Usuario.findByPk(otroParticipante.idUsuario, {
                        attributes: ['idUsuario', 'nombres', 'apellidos', 'correo', 'rol']
                    });
                    if (usuarioSolicitante) {
                        solicitante = {
                            idUsuario: usuarioSolicitante.idUsuario,
                            nombres: usuarioSolicitante.nombres,
                            apellidos: usuarioSolicitante.apellidos,
                            correo: usuarioSolicitante.correo,
                            rol: usuarioSolicitante.rol
                        };
                    }
                }
            }

           // Un ticket de soporte sin solicitante real (solo superadmins
            // adentro) es un ticket huérfano/de prueba — se oculta siempre,
            // sin importar si quedó basura en la base de datos.
            if (c.tipo === 'soporte' && !solicitante) {
                return null;
            }

            return {
                ...c.datosCompletos(),
                noLeidos,
                tieneNoLeidos: noLeidos > 0,
                fechaUltimoVisto: part?.fechaUltimoVisto || null,
                solicitante
            };
        })
    );

    return { conversaciones: conversacionesEnriquecidas.filter(Boolean) };
};

/**
 * idEmpresa es opcional: si se pasa, se exige coincidencia exacta (chats
 * de tienda). Si no se pasa (soporte), no se filtra por empresa —
 * esParticipante ya garantiza el control de acceso.
 */
const obtenerConversacion = async (idConversacion, idUsuario, idEmpresa = null) => {
    const participa = await esParticipante(idConversacion, idUsuario);

    if (!participa) {
        return { exito: false, mensaje: 'No tienes acceso a esta conversación' };
    }

    const where = { idConversacion };
    if (idEmpresa) where.idEmpresa = idEmpresa;

    const conversacion = await Conversacion.findOne({ where });

    if (!conversacion) {
        return { exito: false, mensaje: 'Conversación no encontrada' };
    }

    const participantes = await ParticipanteConversacion.findAll({
        where: { idConversacion }
    });

    return {
        exito: true,
        conversacion: conversacion.datosCompletos(),
        participantes: participantes.map(p => p.datosCompletos())
    };
};

// =====================================================
// MENSAJES
// =====================================================

const enviarMensaje = async (idConversacion, idRemitente, datos) => {
    const participa = await esParticipante(idConversacion, idRemitente);
    if (!participa) {
        return { exito: false, mensaje: 'No puedes enviar mensajes a esta conversación' };
    }

    const transaction = await sequelize.transaction();

    try {
        const mensaje = await Mensaje.create({
            idConversacion,
            idRemitente,
            contenido: datos.contenido,
            tipoContenido: datos.tipoContenido || 'texto',
            urlArchivo: datos.urlArchivo || null
        }, { transaction });

        const conversacion = await Conversacion.findByPk(idConversacion, { transaction });
        let participantesRestantes = [];

        if (conversacion) {
            const preview = (datos.tipoContenido && datos.tipoContenido !== 'texto')
                ? `[${datos.tipoContenido}]`
                : datos.contenido.substring(0, 200);

            conversacion.ultimoMensaje = preview;
            conversacion.fechaUltimoMensaje = new Date();
            await conversacion.save({ transaction });

            participantesRestantes = await ParticipanteConversacion.findAll({
                where: { idConversacion, idUsuario: { [Op.ne]: idRemitente } },
                transaction
            });
        }

        await transaction.commit();

        logger.info(`Mensaje enviado en conversación ${idConversacion} por ${idRemitente}`);

        const io = obtenerIO();
        if (io) {
            io.to(`conversacion:${idConversacion}`).emit('mensaje_nuevo', mensaje.datosCompletos());
        }

        if (conversacion && participantesRestantes.length > 0) {
            const remitente = await Usuario.findByPk(idRemitente);
            const nombreRemitente = remitente ? `${remitente.nombres}`.trim() : 'Alguien';
            const previewNotificacion = mensaje.contenido.length > 80
                ? `${mensaje.contenido.substring(0, 80)}...`
                : mensaje.contenido;

            participantesRestantes.forEach((part) => {
                let urlAccion;
                if (conversacion.tipo === 'soporte') {
                    if (part.rol === 'superadmin') urlAccion = `/soporte-admin/${idConversacion}`;
                    else if (part.rol === 'cliente') urlAccion = `/soporte/${idConversacion}`;
                    else urlAccion = `/soporte-negocio/${idConversacion}`;
                } else {
                    urlAccion = part.rol === 'cliente'
                        ? `/mis-compras/chat/${conversacion.idEmpresa}/${idConversacion}`
                        : `/mensajes/${idConversacion}`;
                }

                notificacionService.crearOActualizarNotificacionMensaje({
                    idUsuario: part.idUsuario,
                    idEmpresa: conversacion.idEmpresa,
                    titulo: `Nuevo mensaje de ${nombreRemitente}`,
                    mensaje: previewNotificacion,
                    tipo: 'mensaje',
                    urlAccion
                });
            });
        }

        return {
            exito: true,
            datosMensaje: mensaje.datosCompletos(),
            mensaje: 'Mensaje enviado'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al enviar mensaje: ${error.message}`);
        throw error;
    }
};

const listarMensajes = async (idConversacion, idUsuario, filtros = {}) => {
    const participa = await esParticipante(idConversacion, idUsuario);
    if (!participa) {
        return { exito: false, mensaje: 'No tienes acceso a esta conversación' };
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 50;

    const count = await Mensaje.count({ where: { idConversacion, eliminado: false } });

    // Para la página 1 (la vista normal del chat), traemos los últimos
    // limit mensajes en orden cronológico -- no los primeros. Antes se
    // pedía siempre "los más antiguos" con offset 0, así que en cuanto la
    // conversación superaba limit mensajes, los mensajes nuevos nunca
    // volvían a aparecer porque quedaban en una "página" que el frontend
    // nunca pide (siempre pide página 1).
    let rows;
    if (pagina === 1) {
        rows = await Mensaje.findAll({
            where: { idConversacion, eliminado: false },
            order: [['fecha_creacion', 'DESC']],
            limit
        });
        rows.reverse();
    } else {
        const offset = (pagina - 1) * limit;
        rows = await Mensaje.findAll({
            where: { idConversacion, eliminado: false },
            order: [['fecha_creacion', 'ASC']],
            limit,
            offset
        });
    }

    return {
        exito: true,
        mensajes: rows.map(m => m.datosCompletos()),
        paginacion: {
            total: count,
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

const marcarLeidos = async (idConversacion, idUsuario) => {
    const participa = await esParticipante(idConversacion, idUsuario);
    if (!participa) {
        return { exito: false, mensaje: 'No tienes acceso a esta conversación' };
    }

    const transaction = await sequelize.transaction();

    try {
        await Mensaje.update(
            { leido: true, fechaLectura: new Date() },
            {
                where: {
                    idConversacion,
                    idRemitente: { [Op.ne]: idUsuario },
                    leido: false
                },
                transaction
            }
        );

        await ParticipanteConversacion.update(
            { fechaUltimoVisto: new Date() },
            {
                where: { idConversacion, idUsuario },
                transaction
            }
        );

        await transaction.commit();

        await notificacionService.marcarLeidasPorConversacion(idUsuario, idConversacion);

        return { exito: true, mensaje: 'Mensajes marcados como leídos' };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al marcar leídos: ${error.message}`);
        throw error;
    }
};

module.exports = {
    crearConversacion,
    esParticipante,
    listarConversacionesUsuario,
    obtenerConversacion,
    enviarMensaje,
    listarMensajes,
    marcarLeidos
};