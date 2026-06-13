const pedidoService = require('../services/private/pedidoService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Resuelve el idEmpresa del contexto de la petición
 */
const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * POST /api/pedidos
 * Crea un pedido desde el carrito activo del cliente
 */
const crearPedido = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar de qué empresa es el pedido (idEmpresa)');
        }

        const resultado = await pedidoService.crearPedidoDesdeCarrito(req.userId, idEmpresa, {
            tipoEntrega: req.body.tipoEntrega,
            tipoPago: req.body.tipoPago,
            idDireccion: req.body.idDireccion,
            direccionEnvio: req.body.direccionEnvio,
            latitudEntrega: req.body.latitudEntrega,
            longitudEntrega: req.body.longitudEntrega,
            costoDomicilio: req.body.costoDomicilio,
            impuestos: req.body.impuestos,
            notas: req.body.notas
        });

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('Stock insuficiente') ? 409 : 400;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, resultado.pedido);
    } catch (error) {
        logger.error(`Error al crear pedido: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pedidos/:idPedido
 * Obtiene un pedido completo con detalles y seguimiento
 */
const obtenerPedido = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await pedidoService.obtenerPedidoCompleto(req.params.idPedido, idEmpresa);

        if (!resultado) {
            return sendResponse(res, 404, false, 'Pedido no encontrado');
        }

        return sendResponse(res, 200, true, 'Pedido obtenido', resultado);
    } catch (error) {
        logger.error(`Error al obtener pedido: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pedidos
 * Lista los pedidos de la empresa (para vendedores/admins)
 */
const listarPedidos = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await pedidoService.listarPedidos(idEmpresa, {
            estado: req.query.estado,
            pagina: req.query.pagina,
            limit: req.query.limit
        });

        return sendResponse(res, 200, true, 'Pedidos obtenidos', resultado);
    } catch (error) {
        logger.error(`Error al listar pedidos: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pedidos/mis-compras
 * Lista los pedidos del cliente autenticado (sus compras)
 */
const misCompras = async (req, res, next) => {
    try {
        const resultado = await pedidoService.listarPedidosCliente(req.userId, {
            estado: req.query.estado,
            pagina: req.query.pagina,
            limit: req.query.limit
        });

        return sendResponse(res, 200, true, 'Tus compras', resultado);
    } catch (error) {
        logger.error(`Error al listar compras del cliente: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearPedido,
    obtenerPedido,
    listarPedidos,
    misCompras
};