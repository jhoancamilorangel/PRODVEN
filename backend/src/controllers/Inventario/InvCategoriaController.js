const invCategoriaService = require('../../services/inventario/invCategoriaService');
const { sendResponse } = require('../../utils/response');
const logger = require('../../config/logger');

const listarCategorias = async (req, res, next) => {
    try {
        const categorias = await invCategoriaService.listarCategorias(req.tenantId);
        return sendResponse(res, 200, true, 'Categorías obtenidas', { categorias });
    } catch (error) {
        logger.error(`Error al listar categorías inv: ${error.message}`);
        next(error);
    }
};

const obtenerCategoria = async (req, res, next) => {
    try {
        const categoria = await invCategoriaService.obtenerCategoria(req.tenantId, req.params.id);
        if (!categoria) return sendResponse(res, 404, false, 'Categoría no encontrada');
        return sendResponse(res, 200, true, 'Categoría obtenida', categoria);
    } catch (error) {
        logger.error(`Error al obtener categoría inv: ${error.message}`);
        next(error);
    }
};

const crearCategoria = async (req, res, next) => {
    try {
        const categoria = await invCategoriaService.crearCategoria(req.tenantId, req.body);
        return sendResponse(res, 201, true, 'Categoría creada correctamente', categoria);
    } catch (error) {
        logger.error(`Error al crear categoría inv: ${error.message}`);
        next(error);
    }
};

const actualizarCategoria = async (req, res, next) => {
    try {
        const categoria = await invCategoriaService.actualizarCategoria(req.tenantId, req.params.id, req.body);
        if (!categoria) return sendResponse(res, 404, false, 'Categoría no encontrada');
        return sendResponse(res, 200, true, 'Categoría actualizada', categoria);
    } catch (error) {
        logger.error(`Error al actualizar categoría inv: ${error.message}`);
        next(error);
    }
};

const eliminarCategoria = async (req, res, next) => {
    try {
        const resultado = await invCategoriaService.eliminarCategoria(req.tenantId, req.params.id);
        if (!resultado.eliminado) return sendResponse(res, 404, false, 'Categoría no encontrada');
        return sendResponse(res, 200, true, 'Categoría eliminada correctamente');
    } catch (error) {
        logger.error(`Error al eliminar categoría inv: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
};