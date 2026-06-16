const Conversacion = require('../../models/Conversacion');
const ParticipanteConversacion = require('../../models/ParticipanteConversacion');
const Mensaje = require('../../models/Mensaje');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');
const { Op } = require('sequelize');

/**
 * Servicio de Mensajería (capa REST)
 *
 * Maneja conversaciones y mensajes guardados en base de datos:
 *  - Crear conversaciones y agregar participantes
 *  - Enviar mensajes (actualizando el preview del último mensaje)
 *  - Listar conversaciones de un usuario y mensajes de una conversación
 *  - Marcar mensajes como leídos
 *
 * El tiempo real (Socket.io) se integrará en una fase futura junto al
 * frontend. Por ahora, toda la mensajería funciona por REST y queda
 * persistida, lista para que el frontend la consuma y luego la dinamice.
 */

// =====================================================
// CONVERSACIONES
// =====================================================

/**
 * Crea una conversación y agrega a sus participantes
 *
 * @param {string} idEmpresa - Empresa
 * @param {object} datos - { tipo, asunto, participantes: [{ idUsuario, rol }] }
 * @param {string} idCreador - Usuario que crea la conversación
 * @returns {Promise<object>} { exito, conversacion, mensaje }
 */
const crearConversacion = async (idEmpresa, datos, idCreador) => {
    const transaction = await sequelize.transaction();

    try {
        const conversacion = await Conversacion.create({
            idEmpresa,
            tipo: datos.tipo || 'cliente',
            asunto: datos.asunto || null,
            estado: 'activa'
        }, { transaction });

        // Lista de participantes a agregar
        const participantes = datos.participantes || [];

        // Asegurar que el creador esté entre los participantes
        const creadorIncluido = participantes.some(p => p.idUsuario === idCreador);
        if (!creadorIncluido) {
            participantes.push({ idUsuario: idCreador, rol: datos.rolCreador || 'cliente' });
        }

        for (const part of participantes) {
            await ParticipanteConversacion.create({
                idConversacion: conversacion.idConversacion,
                idUsuario: part.idUsuario,
                rol: part.rol || 'cliente'
            }, { transaction });
        }

        await transaction.commit();

        logger.info(`Conversación creada: ${conversacion.idConversacion} en empresa ${idEmpresa}`);

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

/**
 * Verifica si un usuario es participante de una conversación
 */
const esParticipante = async (idConversacion, idUsuario) => {
    const participante = await ParticipanteConversacion.findOne({
        where: { idConversacion, idUsuario }
    });
    return participante !== null;
};

/**
 * Lista las conversaciones en las que participa un usuario
 */
const listarConversacionesUsuario = async (idUsuario, idEmpresa) => {
    // Buscar las conversaciones donde el usuario es participante
    const participaciones = await ParticipanteConversacion.findAll({
        where: { idUsuario }
    });

    const idsConversaciones = participaciones.map(p => p.idConversacion);

    if (idsConversaciones.length === 0) {
        return { conversaciones: [] };
    }

    const conversaciones = await Conversacion.findAll({
        where: {
            idConversacion: { [Op.in]: idsConversaciones },
            idEmpresa,
            activo: true
        },
        order: [['fecha_ultimo_mensaje', 'DESC']]
    });

    return { conversaciones: conversaciones.map(c => c.datosCompletos()) };
};

/**
 * Obtiene una conversación si el usuario es participante
 */
const obtenerConversacion = async (idConversacion, idUsuario, idEmpresa) => {
    const participa = await esParticipante(idConversacion, idUsuario);

    if (!participa) {
        return { exito: false, mensaje: 'No tienes acceso a esta conversación' };
    }

    const conversacion = await Conversacion.findOne({
        where: { idConversacion, idEmpresa }
    });

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

/**
 * Envía un mensaje en una conversación
 *
 * @param {string} idConversacion - Conversación destino
 * @param {string} idRemitente - Usuario que envía
 * @param {object} datos - { contenido, tipoContenido, urlArchivo }
 * @returns {Promise<object>} { exito, mensaje, datosMensaje }
 */
const enviarMensaje = async (idConversacion, idRemitente, datos) => {
    // Verificar que el remitente sea participante
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

        // Actualizar el preview del último mensaje en la conversación
        const conversacion = await Conversacion.findByPk(idConversacion, { transaction });
        if (conversacion) {
            // Para el preview, si es texto usa el contenido; si no, una etiqueta
            const preview = (datos.tipoContenido && datos.tipoContenido !== 'texto')
                ? `[${datos.tipoContenido}]`
                : datos.contenido.substring(0, 200);

            conversacion.ultimoMensaje = preview;
            conversacion.fechaUltimoMensaje = new Date();
            await conversacion.save({ transaction });
        }

        await transaction.commit();

        logger.info(`Mensaje enviado en conversación ${idConversacion} por ${idRemitente}`);

        // NOTA: aquí, en la fase de tiempo real, se emitirá el evento Socket.io
        // io.to(idConversacion).emit('mensaje_nuevo', mensaje.datosCompletos());

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

/**
 * Lista los mensajes de una conversación (el historial del chat)
 * Solo si el usuario es participante
 */
const listarMensajes = async (idConversacion, idUsuario, filtros = {}) => {
    const participa = await esParticipante(idConversacion, idUsuario);
    if (!participa) {
        return { exito: false, mensaje: 'No tienes acceso a esta conversación' };
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 50;
    const offset = (pagina - 1) * limit;

    const { count, rows } = await Mensaje.findAndCountAll({
        where: { idConversacion, eliminado: false },
        order: [['fecha_creacion', 'ASC']],
        limit,
        offset
    });

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

/**
 * Marca como leídos los mensajes de una conversación para un usuario
 * Actualiza la fecha de último visto del participante y marca los mensajes
 * de otros como leídos
 */
const marcarLeidos = async (idConversacion, idUsuario) => {
    const participa = await esParticipante(idConversacion, idUsuario);
    if (!participa) {
        return { exito: false, mensaje: 'No tienes acceso a esta conversación' };
    }

    const transaction = await sequelize.transaction();

    try {
        // Marcar como leídos los mensajes que NO son de este usuario
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

        // Actualizar la fecha de último visto del participante
        await ParticipanteConversacion.update(
            { fechaUltimoVisto: new Date() },
            {
                where: { idConversacion, idUsuario },
                transaction
            }
        );

        await transaction.commit();

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