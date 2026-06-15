const zonaService = require('../services/private/zonaService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * POST /api/zonas
 * Crea una zona de cobertura
 */
const crearZona = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await zonaService.crearZona(idEmpresa, {
            nombre: req.body.nombre,
            tipo: req.body.tipo,
            latitudCentro: req.body.latitudCentro,
            longitudCentro: req.body.longitudCentro,
            radioKm: req.body.radioKm,
            costoAdicional: req.body.costoAdicional,
            tiempoEstimadoMin: req.body.tiempoEstimadoMin
        });

        if (!resultado.exito) {
            return sendResponse(res, 400, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, resultado.zona);
    } catch (error) {
        logger.error(`Error al crear zona: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/zonas
 * Lista las zonas de cobertura de la empresa
 */
const listarZonas = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const zonas = await zonaService.listarZonas(idEmpresa);

        return sendResponse(res, 200, true, 'Zonas obtenidas', { zonas });
    } catch (error) {
        logger.error(`Error al listar zonas: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/zonas/:idZona
 * Obtiene una zona específica
 */
const obtenerZona = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const zona = await zonaService.obtenerZona(req.params.idZona, idEmpresa);

        if (!zona) {
            return sendResponse(res, 404, false, 'Zona no encontrada');
        }

        return sendResponse(res, 200, true, 'Zona obtenida', zona);
    } catch (error) {
        logger.error(`Error al obtener zona: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/zonas/:idZona
 * Actualiza una zona
 */
const actualizarZona = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await zonaService.actualizarZona(req.params.idZona, idEmpresa, req.body);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.zona);
    } catch (error) {
        logger.error(`Error al actualizar zona: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/zonas/:idZona
 * Desactiva una zona
 */
const desactivarZona = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await zonaService.desactivarZona(req.params.idZona, idEmpresa);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al desactivar zona: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/zonas/validar-cobertura
 * Valida si una dirección (lat/long) tiene cobertura
 */
const validarCobertura = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const { latitud, longitud } = req.query;

        if (latitud === undefined || longitud === undefined) {
            return sendResponse(res, 400, false, 'Debes indicar latitud y longitud');
        }

        const resultado = await zonaService.validarCobertura(
            idEmpresa,
            parseFloat(latitud),
            parseFloat(longitud)
        );

        return sendResponse(res, 200, true, resultado.mensaje, resultado);
    } catch (error) {
        logger.error(`Error al validar cobertura: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearZona,
    listarZonas,
    obtenerZona,
    actualizarZona,
    desactivarZona,
    validarCobertura
};