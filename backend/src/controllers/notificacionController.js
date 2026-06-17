const notificacionService = require('../services/private/notificacionService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/notificaciones
 * Lista las notificaciones del usuario autenticado
 */
const listarNotificaciones = async (req, res, next) => {
    try {
        const resultado = await notificacionService.listarNotificaciones(req.userId, {
            soloNoLeidas: req.query.soloNoLeidas,
            pagina: req.query.pagina,
            limit: req.query.limit
        });

        return sendResponse(res, 200, true, 'Notificaciones obtenidas', resultado);
    } catch (error) {
        logger.error(`Error al listar notificaciones: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/notificaciones/no-leidas
 * Devuelve el contador de notificaciones no leídas (para el badge)
 */
const contarNoLeidas = async (req, res, next) => {
    try {
        const resultado = await notificacionService.contarNoLeidas(req.userId);

        return sendResponse(res, 200, true, 'Conteo de no leídas', resultado);
    } catch (error) {
        logger.error(`Error al contar no leídas: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/notificaciones/:idNotificacion/leer
 * Marca una notificación como leída
 */
const marcarLeida = async (req, res, next) => {
    try {
        const resultado = await notificacionService.marcarLeida(req.params.idNotificacion, req.userId);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al marcar notificación leída: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/notificaciones/leer-todas
 * Marca todas las notificaciones del usuario como leídas
 */
const marcarTodasLeidas = async (req, res, next) => {
    try {
        const resultado = await notificacionService.marcarTodasLeidas(req.userId);

        return sendResponse(res, 200, true, resultado.mensaje, { marcadas: resultado.marcadas });
    } catch (error) {
        logger.error(`Error al marcar todas leídas: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarNotificaciones,
    contarNoLeidas,
    marcarLeida,
    marcarTodasLeidas
};