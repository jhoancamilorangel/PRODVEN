const promocionService = require('../services/private/promocionService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * POST /api/promociones
 * Crea una promoción
 */
const crearPromocion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await promocionService.crearPromocion(idEmpresa, {
            idProducto: req.body.idProducto,
            nombre: req.body.nombre,
            descripcion: req.body.descripcion,
            tipo: req.body.tipo,
            valor: req.body.valor,
            codigo: req.body.codigo,
            usoMaximo: req.body.usoMaximo,
            fechaInicio: req.body.fechaInicio,
            fechaFin: req.body.fechaFin
        });

        if (!resultado.exito) {
            return sendResponse(res, 400, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, resultado.promocion);
    } catch (error) {
        logger.error(`Error al crear promoción: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/promociones
 * Lista las promociones de la empresa
 */
const listarPromociones = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await promocionService.listarPromociones(idEmpresa, {
            soloVigentes: req.query.soloVigentes
        });

        return sendResponse(res, 200, true, 'Promociones obtenidas', resultado);
    } catch (error) {
        logger.error(`Error al listar promociones: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/promociones/:idPromocion
 * Obtiene una promoción
 */
const obtenerPromocion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const promocion = await promocionService.obtenerPromocion(req.params.idPromocion, idEmpresa);

        if (!promocion) {
            return sendResponse(res, 404, false, 'Promoción no encontrada');
        }

        return sendResponse(res, 200, true, 'Promoción obtenida', promocion);
    } catch (error) {
        logger.error(`Error al obtener promoción: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/promociones/:idPromocion
 * Actualiza una promoción
 */
const actualizarPromocion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await promocionService.actualizarPromocion(
            req.params.idPromocion,
            idEmpresa,
            req.body
        );

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.promocion);
    } catch (error) {
        logger.error(`Error al actualizar promoción: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/promociones/:idPromocion
 * Desactiva una promoción
 */
const desactivarPromocion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await promocionService.desactivarPromocion(req.params.idPromocion, idEmpresa);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al desactivar promoción: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/promociones/validar
 * Valida un código de promoción contra un monto y calcula el descuento
 */
const validarPromocion = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const { codigo, monto } = req.body;

        if (!codigo) {
            return sendResponse(res, 400, false, 'Debes indicar el código de la promoción');
        }

        if (monto === undefined || parseFloat(monto) <= 0) {
            return sendResponse(res, 400, false, 'Debes indicar un monto válido');
        }

        const resultado = await promocionService.validarPromocionPorCodigo(
            idEmpresa,
            codigo,
            parseFloat(monto)
        );

        if (!resultado.valida) {
            return sendResponse(res, 409, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, {
            descuento: resultado.descuento,
            promocion: resultado.promocion
        });
    } catch (error) {
        logger.error(`Error al validar promoción: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearPromocion,
    listarPromociones,
    obtenerPromocion,
    actualizarPromocion,
    desactivarPromocion,
    validarPromocion
};