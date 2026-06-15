const domiciliarioService = require('../services/private/domiciliarioService');
const ubicacionService = require('../services/private/ubicacionService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * PUT /api/domiciliarios/:idDomiciliario
 * Actualiza los datos de un domiciliario
 */
const actualizarDomiciliario = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await domiciliarioService.actualizarDomiciliario(
            req.params.idDomiciliario,
            idEmpresa,
            req.body
        );

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.domiciliario);
    } catch (error) {
        logger.error(`Error al actualizar domiciliario: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/domiciliarios/:idDomiciliario/disponibilidad
 * Cambia la disponibilidad de un domiciliario
 */
const cambiarDisponibilidad = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        if (req.body.disponible === undefined) {
            return sendResponse(res, 400, false, 'Debes indicar el valor de disponible (true o false)');
        }

        const resultado = await domiciliarioService.cambiarDisponibilidad(
            req.params.idDomiciliario,
            idEmpresa,
            req.body.disponible
        );

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.domiciliario);
    } catch (error) {
        logger.error(`Error al cambiar disponibilidad: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/domiciliarios/:idDomiciliario
 * Desactiva un domiciliario
 */
const desactivarDomiciliario = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await domiciliarioService.desactivarDomiciliario(
            req.params.idDomiciliario,
            idEmpresa
        );

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al desactivar domiciliario: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/domiciliarios/disponibles
 * Lista los domiciliarios disponibles
 */
const listarDisponibles = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const domiciliarios = await domiciliarioService.listarDisponibles(idEmpresa);

        return sendResponse(res, 200, true, 'Domiciliarios disponibles', { domiciliarios });
    } catch (error) {
        logger.error(`Error al listar disponibles: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/pedidos/:idPedido/asignar-domiciliario
 * Asigna un domiciliario a un pedido (automático o manual)
 */
const asignarDomiciliario = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        let resultado;

        // Si viene idDomiciliario, es asignación manual; si no, automática
        if (req.body.idDomiciliario) {
            resultado = await domiciliarioService.asignarManual(
                req.params.idPedido,
                req.body.idDomiciliario,
                idEmpresa
            );
        } else {
            resultado = await domiciliarioService.asignarAutomatico(
                req.params.idPedido,
                idEmpresa
            );
        }

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('no encontrado') ? 404 : 409;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.domiciliario);
    } catch (error) {
        logger.error(`Error al asignar domiciliario: ${error.message}`);
        next(error);
    }
};

module.exports = {
    actualizarDomiciliario,
    cambiarDisponibilidad,
    desactivarDomiciliario,
    listarDisponibles,
    asignarDomiciliario
};