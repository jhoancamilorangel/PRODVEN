const mensajeriaService = require('../services/private/mensajeriaService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * POST /api/conversaciones
 * Crea una conversación
 */
const crearConversacion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await mensajeriaService.crearConversacion(
            idEmpresa,
            {
                tipo: req.body.tipo,
                asunto: req.body.asunto,
                participantes: req.body.participantes,
                rolCreador: req.body.rolCreador
            },
            req.userId
        );

        return sendResponse(res, 201, true, resultado.mensaje, resultado.conversacion);
    } catch (error) {
        logger.error(`Error al crear conversación: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/conversaciones
 * Lista las conversaciones del usuario autenticado
 */
const listarConversaciones = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await mensajeriaService.listarConversacionesUsuario(req.userId, idEmpresa);

        return sendResponse(res, 200, true, 'Conversaciones obtenidas', resultado);
    } catch (error) {
        logger.error(`Error al listar conversaciones: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/conversaciones/:idConversacion
 * Obtiene una conversación con sus participantes
 */
const obtenerConversacion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await mensajeriaService.obtenerConversacion(
            req.params.idConversacion,
            req.userId,
            idEmpresa
        );

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('acceso') ? 403 : 404;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, 'Conversación obtenida', resultado);
    } catch (error) {
        logger.error(`Error al obtener conversación: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/conversaciones/:idConversacion/mensajes
 * Envía un mensaje en una conversación
 */
const enviarMensaje = async (req, res, next) => {
    try {
        const resultado = await mensajeriaService.enviarMensaje(
            req.params.idConversacion,
            req.userId,
            {
                contenido: req.body.contenido,
                tipoContenido: req.body.tipoContenido,
                urlArchivo: req.body.urlArchivo
            }
        );

        if (!resultado.exito) {
            return sendResponse(res, 403, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, resultado.datosMensaje);
    } catch (error) {
        logger.error(`Error al enviar mensaje: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/conversaciones/:idConversacion/mensajes
 * Lista los mensajes de una conversación
 */
const listarMensajes = async (req, res, next) => {
    try {
        const resultado = await mensajeriaService.listarMensajes(
            req.params.idConversacion,
            req.userId,
            { pagina: req.query.pagina, limit: req.query.limit }
        );

        if (!resultado.exito) {
            return sendResponse(res, 403, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, 'Mensajes obtenidos', resultado);
    } catch (error) {
        logger.error(`Error al listar mensajes: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/conversaciones/:idConversacion/leer
 * Marca como leídos los mensajes de la conversación
 */
const marcarLeidos = async (req, res, next) => {
    try {
        const resultado = await mensajeriaService.marcarLeidos(req.params.idConversacion, req.userId);

        if (!resultado.exito) {
            return sendResponse(res, 403, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al marcar leídos: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearConversacion,
    listarConversaciones,
    obtenerConversacion,
    enviarMensaje,
    listarMensajes,
    marcarLeidos
};