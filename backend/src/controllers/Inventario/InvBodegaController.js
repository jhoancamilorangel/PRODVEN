const invBodegaService = require('../../services/inventario/invBodegaService');
const { sendResponse } = require('../../utils/response');
const logger = require('../../config/logger');

const listarBodegas = async (req, res, next) => {
    try {
        const bodegas = await invBodegaService.listarBodegas(req.tenantId);
        return sendResponse(res, 200, true, 'Bodegas obtenidas', { bodegas });
    } catch (error) {
        logger.error(`Error al listar bodegas inv: ${error.message}`);
        next(error);
    }
};

const obtenerBodega = async (req, res, next) => {
    try {
        const bodega = await invBodegaService.obtenerBodega(req.tenantId, req.params.id);
        if (!bodega) return sendResponse(res, 404, false, 'Bodega no encontrada');
        return sendResponse(res, 200, true, 'Bodega obtenida', bodega);
    } catch (error) {
        logger.error(`Error al obtener bodega inv: ${error.message}`);
        next(error);
    }
};

const crearBodega = async (req, res, next) => {
    try {
        const bodega = await invBodegaService.crearBodega(req.tenantId, req.body);
        return sendResponse(res, 201, true, 'Bodega creada correctamente', bodega);
    } catch (error) {
        logger.error(`Error al crear bodega inv: ${error.message}`);
        next(error);
    }
};

const actualizarBodega = async (req, res, next) => {
    try {
        const bodega = await invBodegaService.actualizarBodega(req.tenantId, req.params.id, req.body);
        if (!bodega) return sendResponse(res, 404, false, 'Bodega no encontrada');
        return sendResponse(res, 200, true, 'Bodega actualizada', bodega);
    } catch (error) {
        logger.error(`Error al actualizar bodega inv: ${error.message}`);
        next(error);
    }
};

const eliminarBodega = async (req, res, next) => {
    try {
        const resultado = await invBodegaService.eliminarBodega(req.tenantId, req.params.id);
        if (!resultado.eliminado) {
            if (resultado.motivo === 'principal') return sendResponse(res, 409, false, 'No se puede eliminar la bodega principal.');
            if (resultado.motivo === 'con_stock') return sendResponse(res, 409, false, 'No se puede eliminar una bodega con stock. Transfiere o saca el stock primero.');
            return sendResponse(res, 404, false, 'Bodega no encontrada');
        }
        return sendResponse(res, 200, true, 'Bodega eliminada correctamente');
    } catch (error) {
        logger.error(`Error al eliminar bodega inv: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarBodegas,
    obtenerBodega,
    crearBodega,
    actualizarBodega,
    eliminarBodega
};