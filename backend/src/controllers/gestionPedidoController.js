const gestionPedidoService = require('../services/private/gestionPedidoService');
const carritoService = require('../services/private/carritoService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * PATCH /api/pedidos/:idPedido/estado
 * Cambia el estado de un pedido (gestión por el negocio)
 */
const cambiarEstado = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const { nuevoEstado, descripcion, latitud, longitud } = req.body;

        if (!nuevoEstado) {
            return sendResponse(res, 400, false, 'Debes indicar el nuevo estado');
        }

        const resultado = await gestionPedidoService.cambiarEstado(
            req.params.idPedido,
            idEmpresa,
            nuevoEstado,
            req.userId,
            {
                descripcion,
                ubicacion: { latitud, longitud }
            }
        );

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('no encontrado') ? 404 : 409;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.pedido);
    } catch (error) {
        logger.error(`Error al cambiar estado del pedido: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/pedidos/:idPedido/cancelar
 * Cancela un pedido. Si lo hace el cliente, valida que sea suyo y no despachado.
 */
const cancelarPedido = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);
        const motivo = req.body ? req.body.motivo : null;

        // Si es superadmin o tiene empresa (negocio), cancela como negocio
        // Si es cliente, valida que el pedido sea suyo
        if (req.esCliente) {
            const cliente = await carritoService.resolverCliente(req.userId);
            const resultado = await gestionPedidoService.cancelarPedidoCliente(
                req.params.idPedido,
                cliente.idCliente,
                req.userId,
                motivo
            );

            if (!resultado.exito) {
                const status = resultado.mensaje.includes('no encontrado') ? 404 : 409;
                return sendResponse(res, status, false, resultado.mensaje);
            }

            return sendResponse(res, 200, true, resultado.mensaje, resultado.pedido);
        }

        // Cancelación por el negocio
        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await gestionPedidoService.cambiarEstado(
            req.params.idPedido,
            idEmpresa,
            'cancelado',
            req.userId,
            { motivo, descripcion: motivo || 'Cancelado por el negocio' }
        );

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('no encontrado') ? 404 : 409;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.pedido);
    } catch (error) {
        logger.error(`Error al cancelar pedido: ${error.message}`);
        next(error);
    }
};

module.exports = {
    cambiarEstado,
    cancelarPedido
};