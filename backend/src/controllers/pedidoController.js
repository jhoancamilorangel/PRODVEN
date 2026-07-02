const pedidoService = require('../services/private/pedidoService');
const pagoService = require('../services/private/pagoService');
const Pedido = require('../models/Pedido');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');
const carritoService = require('../services/private/carritoService');

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

/**
 * POST /api/pedidos/:idPedido/pagar
 * Permite al CLIENTE pagar su propio pedido.
 * A diferencia de /api/pagos (que usa req.tenantId del negocio), aquí
 * el idEmpresa se toma del pedido, porque el cliente no tiene empresa.
 */
const pagarPedido = async (req, res, next) => {
    try {
        const { idPedido } = req.params;
        const { metodo } = req.body;

        if (!metodo) {
            return sendResponse(res, 400, false, 'Debes indicar el método de pago');
        }

        // Buscar el pedido y validar que exista
        const pedido = await Pedido.findOne({
            where: { idPedido, eliminado: false }
        });

        if (!pedido) {
            return sendResponse(res, 404, false, 'Pedido no encontrado');
        }

        // Validar que el pedido esté pendiente (no pagar algo ya procesado)
        if (pedido.estado !== 'pendiente') {
            return sendResponse(res, 409, false, `Este pedido ya está en estado "${pedido.etiquetaEstado()}" y no se puede pagar de nuevo`);
        }

        // Crear el pago usando el idEmpresa DEL PEDIDO (no del token)
        const resultado = await pagoService.crearPago(
            {
                tipoPago: 'pedido',
                idPedido: pedido.idPedido,
                monto: parseFloat(pedido.total),
                moneda: 'COP',
                metodo,
                descripcion: `Pago del pedido ${pedido.numeroPedido}`,
                comprador: req.body.comprador || {},
                tarjeta: req.body.tarjeta || null
            },
            pedido.idEmpresa,
            req.userId
        );

        if (!resultado.exito) {
            return sendResponse(res, 402, false, resultado.mensaje, {
                pago: resultado.pago,
                resultadoPasarela: resultado.resultadoPasarela
            });
        }

        return sendResponse(res, 201, true, resultado.mensaje, {
            pago: resultado.pago,
            resultadoPasarela: resultado.resultadoPasarela
        });
    } catch (error) {
        logger.error(`Error al pagar pedido: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pedidos/mis-compras/:idPedido
 * Detalle + seguimiento de UN pedido del cliente autenticado.
 * Valida que el pedido sea suyo (por su cliente global).
 */
const detalleMiCompra = async (req, res, next) => {
    try {
        const { idPedido } = req.params;

        // Resolver el cliente del usuario autenticado
        const cliente = await carritoService.resolverCliente(req.userId);

        // Buscar el pedido y validar que sea de este cliente
        const pedido = await Pedido.findOne({
            where: { idPedido, idCliente: cliente.idCliente, eliminado: false }
        });

        if (!pedido) {
            return sendResponse(res, 404, false, 'Pedido no encontrado o no es tuyo');
        }

        // Reutilizar el servicio que trae detalle + seguimiento, con el idEmpresa del pedido
        const resultado = await pedidoService.obtenerPedidoCompleto(idPedido, pedido.idEmpresa);

        if (!resultado) {
            return sendResponse(res, 404, false, 'Pedido no encontrado');
        }

        return sendResponse(res, 200, true, 'Detalle del pedido', resultado);
    } catch (error) {
        logger.error(`Error al obtener detalle de compra: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearPedido,
    obtenerPedido,
    listarPedidos,
    misCompras,
    detalleMiCompra,
    pagarPedido
};