const carritoService = require('../services/private/carritoService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Resuelve el idEmpresa del contexto de la petición
 * Busca en body, query o tenant, de forma segura ante valores undefined.
 */
const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * GET /api/carrito
 * Obtiene el carrito activo del cliente con sus items
 */
const obtenerCarrito = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar de qué empresa es el carrito (idEmpresa)');
        }

        const resultado = await carritoService.obtenerCarritoCompleto(req.userId, idEmpresa);

        return sendResponse(res, 200, true, 'Carrito obtenido', resultado);
    } catch (error) {
        logger.error(`Error al obtener carrito: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/carrito/items
 * Agrega un producto al carrito
 */
const agregarProducto = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar de qué empresa es el carrito (idEmpresa)');
        }

        const resultado = await carritoService.agregarProducto(req.userId, idEmpresa, {
            idProducto: req.body.idProducto,
            cantidad: req.body.cantidad,
            notas: req.body.notas
        });

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('Stock insuficiente') ? 409 : 400;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        const carritoActualizado = await carritoService.obtenerCarritoCompleto(req.userId, idEmpresa);

        return sendResponse(res, 200, true, resultado.mensaje, carritoActualizado);
    } catch (error) {
        logger.error(`Error al agregar producto al carrito: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/carrito/items/:idItem
 * Actualiza la cantidad de un item
 */
const actualizarCantidad = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar de qué empresa es el carrito (idEmpresa)');
        }

        const resultado = await carritoService.actualizarCantidad(
            req.userId,
            idEmpresa,
            req.params.idItem,
            req.body.cantidad
        );

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('Stock insuficiente') ? 409 : 400;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        const carritoActualizado = await carritoService.obtenerCarritoCompleto(req.userId, idEmpresa);

        return sendResponse(res, 200, true, resultado.mensaje, carritoActualizado);
    } catch (error) {
        logger.error(`Error al actualizar cantidad: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/carrito/items/:idItem
 * Quita un item del carrito
 */
const quitarItem = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar de qué empresa es el carrito (idEmpresa)');
        }

        const resultado = await carritoService.quitarItem(req.userId, idEmpresa, req.params.idItem);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        const carritoActualizado = await carritoService.obtenerCarritoCompleto(req.userId, idEmpresa);

        return sendResponse(res, 200, true, resultado.mensaje, carritoActualizado);
    } catch (error) {
        logger.error(`Error al quitar item: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/carrito
 * Vacía el carrito completo
 */
const vaciarCarrito = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar de qué empresa es el carrito (idEmpresa)');
        }

        const resultado = await carritoService.vaciarCarrito(req.userId, idEmpresa);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al vaciar carrito: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/carrito/todos
 * Obtiene todos los carritos activos del cliente (de todas las tiendas)
 */
const obtenerTodosLosCarritos = async (req, res, next) => {
    try {
        const resultado = await carritoService.obtenerTodosLosCarritos(req.userId);
        return sendResponse(res, 200, true, 'Carritos obtenidos', resultado);
    } catch (error) {
        logger.error(`Error al obtener todos los carritos: ${error.message}`);
        next(error);
    }
};

module.exports = {
    obtenerCarrito,
    obtenerTodosLosCarritos,
    agregarProducto,
    actualizarCantidad,
    quitarItem,
    vaciarCarrito
};