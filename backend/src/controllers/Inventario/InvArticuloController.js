const invArticuloService = require('../../services/inventario/invArticuloService');
const invInventarioService = require('../../services/inventario/invInventarioService');
const { sendResponse } = require('../../utils/response');
const logger = require('../../config/logger');

/**
 * POST /api/inv/articulos
 * Crea un artículo de inventario interno
 */
const crearArticulo = async (req, res, next) => {
    try {
        const articulo = await invArticuloService.crearArticulo(req.body, req.tenantId, req.userId);
        return sendResponse(res, 201, true, 'Artículo creado correctamente', articulo);
    } catch (error) {
        logger.error(`Error al crear artículo: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inv/articulos
 * Lista los artículos con su stock
 */
const listarArticulos = async (req, res, next) => {
    try {
        const filtros = {
            busqueda: req.query.busqueda,
            idCategoria: req.query.idCategoria,
            pagina: req.query.pagina,
            limit: req.query.limit
        };
        const resultado = await invArticuloService.listarArticulos(req.tenantId, filtros);
        return sendResponse(res, 200, true, 'Artículos obtenidos', resultado);
    } catch (error) {
        logger.error(`Error al listar artículos: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inv/stock-bajo
 * Lista los artículos en o por debajo del punto de reorden, o agotados
 */
const listarStockBajo = async (req, res, next) => {
    try {
        const articulos = await invInventarioService.obtenerArticulosStockBajo(req.tenantId);
        return sendResponse(res, 200, true, 'Artículos con stock bajo', { articulos });
    } catch (error) {
        logger.error(`Error al listar stock bajo: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inv/articulos/:id
 * Obtiene un artículo con su stock por bodega
 */
const obtenerArticulo = async (req, res, next) => {
    try {
        const resultado = await invArticuloService.obtenerArticulo(req.tenantId, req.params.id);
        if (!resultado) {
            return sendResponse(res, 404, false, 'Artículo no encontrado');
        }
        return sendResponse(res, 200, true, 'Artículo obtenido', resultado);
    } catch (error) {
        logger.error(`Error al obtener artículo: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/inv/articulos/:id
 * Actualiza un artículo
 */
const actualizarArticulo = async (req, res, next) => {
    try {
        const articulo = await invArticuloService.actualizarArticulo(req.tenantId, req.params.id, req.body);
        if (!articulo) {
            return sendResponse(res, 404, false, 'Artículo no encontrado');
        }
        return sendResponse(res, 200, true, 'Artículo actualizado correctamente', articulo);
    } catch (error) {
        logger.error(`Error al actualizar artículo: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/inv/articulos/:id
 * Elimina lógicamente un artículo
 */
const eliminarArticulo = async (req, res, next) => {
    try {
        const eliminado = await invArticuloService.eliminarArticulo(req.tenantId, req.params.id);
        if (!eliminado) {
            return sendResponse(res, 404, false, 'Artículo no encontrado');
        }
        return sendResponse(res, 200, true, 'Artículo eliminado correctamente');
    } catch (error) {
        logger.error(`Error al eliminar artículo: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearArticulo,
    listarArticulos,
    listarStockBajo,
    obtenerArticulo,
    actualizarArticulo,
    eliminarArticulo
};