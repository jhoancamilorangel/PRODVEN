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
 * idEmpresa solo es obligatorio para tipo 'cliente' (chat con una
 * tienda). Para tipo 'soporte', la conversación no pertenece a
 * ninguna empresa — cualquier usuario puede abrirla sin tener una.
 */
const crearConversacion = async (req, res, next) => {
    try {
        const tipo = req.body.tipo || 'cliente';
        const idEmpresa = resolverEmpresa(req);

        if (tipo !== 'soporte' && !idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await mensajeriaService.crearConversacion(
            idEmpresa,
            {
                tipo,
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
 * idEmpresa ya no es obligatorio: sin ella, se listan las conversaciones
 * del usuario sin filtrar por empresa (necesario para soporte). Se
 * puede filtrar además por ?tipo=soporte|cliente|interna.
 */
const listarConversaciones = async (req, res, next) => {
    try {
        const tipo = req.query.tipo || null;
        // El soporte es global por diseño (idEmpresa siempre null en esas
        // conversaciones). Nunca debe filtrarse por req.tenantId, aunque el
        // usuario (incluido un superadmin) tenga su propia empresa asociada
        // — de lo contrario esa empresa se filtra por error sobre tickets
        // que nunca tuvieron ninguna, devolviendo una lista vacía siempre.
        const idEmpresa = tipo === 'soporte' ? null : resolverEmpresa(req);

        const resultado = await mensajeriaService.listarConversacionesUsuario(req.userId, { idEmpresa, tipo });

        return sendResponse(res, 200, true, 'Conversaciones obtenidas', resultado);
    } catch (error) {
        logger.error(`Error al listar conversaciones: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/conversaciones/:idConversacion
 * idEmpresa ya no es obligatorio (ver mensajeriaService.obtenerConversacion).
 */
const obtenerConversacion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

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