const ubicacionService = require('../services/private/ubicacionService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * POST /api/domiciliarios
 * Crea un domiciliario (gestión mínima)
 */
const crearDomiciliario = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        if (!req.body.idUsuario || !req.body.documentoIdentidad) {
            return sendResponse(res, 400, false, 'El domiciliario requiere idUsuario y documentoIdentidad');
        }

        const domiciliario = await ubicacionService.crearDomiciliario(idEmpresa, {
            idUsuario: req.body.idUsuario,
            tipoVehiculo: req.body.tipoVehiculo,
            placa: req.body.placa,
            documentoIdentidad: req.body.documentoIdentidad,
            licenciaConduccion: req.body.licenciaConduccion
        });

        return sendResponse(res, 201, true, 'Domiciliario creado', domiciliario);
    } catch (error) {
        logger.error(`Error al crear domiciliario: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/domiciliarios
 * Lista los domiciliarios de la empresa
 */
const listarDomiciliarios = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const domiciliarios = await ubicacionService.listarDomiciliarios(idEmpresa);

        return sendResponse(res, 200, true, 'Domiciliarios obtenidos', { domiciliarios });
    } catch (error) {
        logger.error(`Error al listar domiciliarios: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/pedidos/:idPedido/ubicacion
 * Registra una ubicación del pedido en camino
 */
const registrarUbicacion = async (req, res, next) => {
    try {
        const resultado = await ubicacionService.registrarUbicacion({
            idPedido: req.params.idPedido,
            idDomiciliario: req.body.idDomiciliario,
            latitud: req.body.latitud,
            longitud: req.body.longitud,
            velocidad: req.body.velocidad
        });

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('no encontrado') ? 404 : 409;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, resultado.ubicacion);
    } catch (error) {
        logger.error(`Error al registrar ubicación: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pedidos/:idPedido/ubicacion
 * Obtiene la última ubicación del pedido
 */
const obtenerUltimaUbicacion = async (req, res, next) => {
    try {
        const resultado = await ubicacionService.obtenerUltimaUbicacion(req.params.idPedido);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, 'Última ubicación', resultado.ubicacion);
    } catch (error) {
        logger.error(`Error al obtener ubicación: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pedidos/:idPedido/recorrido
 * Obtiene el recorrido completo del pedido
 */
const obtenerRecorrido = async (req, res, next) => {
    try {
        const resultado = await ubicacionService.obtenerRecorrido(req.params.idPedido);

        return sendResponse(res, 200, true, 'Recorrido del pedido', resultado);
    } catch (error) {
        logger.error(`Error al obtener recorrido: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearDomiciliario,
    listarDomiciliarios,
    registrarUbicacion,
    obtenerUltimaUbicacion,
    obtenerRecorrido
};