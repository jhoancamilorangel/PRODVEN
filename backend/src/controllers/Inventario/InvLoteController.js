const invLoteService = require('../../services/inventario/invLoteService');
const { sendResponse } = require('../../utils/response');
const logger = require('../../config/logger');

/**
 * GET /api/inv/lotes/articulo/:idArticulo
 * Lista los lotes de un artículo con su estado de vencimiento.
 */
const listarLotesPorArticulo = async (req, res, next) => {
    try {
        const lotes = await invLoteService.listarLotesPorArticulo(req.tenantId, req.params.idArticulo);
        return sendResponse(res, 200, true, 'Lotes obtenidos', { lotes });
    } catch (error) {
        logger.error(`Error al listar lotes inv: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/inv/lotes
 * Crea un lote y registra la entrada de stock.
 */
const crearLote = async (req, res, next) => {
    try {
        const lote = await invLoteService.crearLote(req.tenantId, req.body, req.userId);
        return sendResponse(res, 201, true, 'Lote creado correctamente', lote);
    } catch (error) {
        logger.error(`Error al crear lote inv: ${error.message}`);
        if (error.message.includes('obligatorios') || error.message.includes('insuficiente')) {
            return sendResponse(res, 400, false, error.message);
        }
        next(error);
    }
};

/**
 * PUT /api/inv/lotes/:id
 * Actualiza los datos de un lote.
 */
const actualizarLote = async (req, res, next) => {
    try {
        const lote = await invLoteService.actualizarLote(req.tenantId, req.params.id, req.body);
        if (!lote) return sendResponse(res, 404, false, 'Lote no encontrado');
        return sendResponse(res, 200, true, 'Lote actualizado', lote);
    } catch (error) {
        logger.error(`Error al actualizar lote inv: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/inv/lotes/:id
 * Elimina lógicamente un lote.
 */
const eliminarLote = async (req, res, next) => {
    try {
        const eliminado = await invLoteService.eliminarLote(req.tenantId, req.params.id);
        if (!eliminado) return sendResponse(res, 404, false, 'Lote no encontrado');
        return sendResponse(res, 200, true, 'Lote eliminado correctamente');
    } catch (error) {
        logger.error(`Error al eliminar lote inv: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarLotesPorArticulo,
    crearLote,
    actualizarLote,
    eliminarLote
};