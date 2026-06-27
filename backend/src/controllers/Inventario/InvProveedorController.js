const invProveedorService = require('../../services/inventario/invProveedorService');
const { sendResponse } = require('../../utils/response');
const logger = require('../../config/logger');

const listarProveedores = async (req, res, next) => {
    try {
        const proveedores = await invProveedorService.listarProveedores(req.tenantId);
        return sendResponse(res, 200, true, 'Proveedores obtenidos', { proveedores });
    } catch (error) {
        logger.error(`Error al listar proveedores inv: ${error.message}`);
        next(error);
    }
};

const obtenerProveedor = async (req, res, next) => {
    try {
        const proveedor = await invProveedorService.obtenerProveedor(req.tenantId, req.params.id);
        if (!proveedor) return sendResponse(res, 404, false, 'Proveedor no encontrado');
        return sendResponse(res, 200, true, 'Proveedor obtenido', proveedor);
    } catch (error) {
        logger.error(`Error al obtener proveedor inv: ${error.message}`);
        next(error);
    }
};

const crearProveedor = async (req, res, next) => {
    try {
        const proveedor = await invProveedorService.crearProveedor(req.tenantId, req.body);
        return sendResponse(res, 201, true, 'Proveedor creado correctamente', proveedor);
    } catch (error) {
        logger.error(`Error al crear proveedor inv: ${error.message}`);
        next(error);
    }
};

const actualizarProveedor = async (req, res, next) => {
    try {
        const proveedor = await invProveedorService.actualizarProveedor(req.tenantId, req.params.id, req.body);
        if (!proveedor) return sendResponse(res, 404, false, 'Proveedor no encontrado');
        return sendResponse(res, 200, true, 'Proveedor actualizado', proveedor);
    } catch (error) {
        logger.error(`Error al actualizar proveedor inv: ${error.message}`);
        next(error);
    }
};

const eliminarProveedor = async (req, res, next) => {
    try {
        const resultado = await invProveedorService.eliminarProveedor(req.tenantId, req.params.id);
        if (!resultado.eliminado) return sendResponse(res, 404, false, 'Proveedor no encontrado');
        return sendResponse(res, 200, true, 'Proveedor eliminado correctamente');
    } catch (error) {
        logger.error(`Error al eliminar proveedor inv: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarProveedores,
    obtenerProveedor,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor
};