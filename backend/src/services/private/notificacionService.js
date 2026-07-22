const Notificacion = require('../../models/Notificacion');
const { Op } = require('sequelize');
const { obtenerIO } = require('../../config/socket');
const logger = require('../../config/logger');

/**
 * Servicio de Notificaciones (parte de base de datos + tiempo real)
 */

/**
 * Avisa por socket al usuario dueño de la notificación que algo cambió
 * (nueva, actualizada, o marcada como leída). El frontend, al recibir
 * esto, refresca el contador/lista de la campana sin esperar polling.
 */
const emitirNotificacion = (idUsuario) => {
    const io = obtenerIO();
    if (io) {
        io.to(`usuario:${idUsuario}`).emit('notificacion_actualizada');
    }
};

// =====================================================
// CREAR NOTIFICACIÓN (uso interno)
// =====================================================

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
        emitirNotificacion(datos.idUsuario);

        return notificacion.datosCompletos();
    } catch (error) {
        logger.error(`Error al crear notificación: ${error.message}`);
        return null;
    }
};

/**
 * Crea o actualiza EN EL MISMO LUGAR la notificación de una conversación
 * (identificada por urlAccion), sin importar si la anterior ya estaba
 * leída. Así cada conversación tiene siempre una única fila en la
 * campana, en vez de acumular una por cada mensaje.
 */
const crearOActualizarNotificacionMensaje = async (datos) => {
    try {
        const existente = await Notificacion.findOne({
            where: {
                idUsuario: datos.idUsuario,
                tipo: 'mensaje',
                urlAccion: datos.urlAccion
            }
        });

        if (existente) {
            await Notificacion.update(
                {
                    titulo: datos.titulo,
                    mensaje: datos.mensaje,
                    leida: false,
                    fecha_envio: new Date()
                },
                { where: { idNotificacion: existente.idNotificacion } }
            );
            await existente.reload();
            emitirNotificacion(datos.idUsuario);
            return existente.datosCompletos();
        }

        return await crearNotificacion(datos);
    } catch (error) {
        logger.error(`Error al crear/actualizar notificación de mensaje: ${error.message}`);
        return null;
    }
};

// =====================================================
// CONSULTAR
// =====================================================

const listarNotificaciones = async (idUsuario, filtros = {}) => {
    const where = { idUsuario };

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

const contarNoLeidas = async (idUsuario) => {
    const total = await Notificacion.count({
        where: { idUsuario, leida: false }
    });

    return { noLeidas: total };
};

// =====================================================
// MARCAR LEÍDAS
// =====================================================

const marcarLeida = async (idNotificacion, idUsuario) => {
    const notificacion = await Notificacion.findOne({
        where: { idNotificacion, idUsuario }
    });

    if (!notificacion) {
        return { exito: false, mensaje: 'Notificación no encontrada' };
    }

    notificacion.leida = true;
    await notificacion.save();
    emitirNotificacion(idUsuario);

    return { exito: true, mensaje: 'Notificación marcada como leída' };
};

const marcarTodasLeidas = async (idUsuario) => {
    const [afectadas] = await Notificacion.update(
        { leida: true },
        { where: { idUsuario, leida: false } }
    );

    emitirNotificacion(idUsuario);

    return { exito: true, marcadas: afectadas, mensaje: `${afectadas} notificaciones marcadas como leídas` };
};

/**
 * Marca como leídas las notificaciones de tipo 'mensaje' que correspondan
 * a una conversación específica (identificada dentro de urlAccion).
 */
const marcarLeidasPorConversacion = async (idUsuario, idConversacion) => {
    try {
        await Notificacion.update(
            { leida: true },
            {
                where: {
                    idUsuario,
                    tipo: 'mensaje',
                    urlAccion: { [Op.like]: `%${idConversacion}` },
                    leida: false
                }
            }
        );
        emitirNotificacion(idUsuario);
    } catch (error) {
        logger.error(`Error al marcar notificaciones de conversación como leídas: ${error.message}`);
    }
};

module.exports = {
    crearNotificacion,
    crearOActualizarNotificacionMensaje,
    marcarLeidasPorConversacion,
    listarNotificaciones,
    contarNoLeidas,
    marcarLeida,
    marcarTodasLeidas
};