const invInventarioService = require('../../services/inventario/invInventarioService');
const { sendResponse } = require('../../utils/response');
const logger = require('../../config/logger');

/**
 * POST /api/inv/movimientos
 * Registra un movimiento manual (entrada/salida)
 */
const registrarMovimiento = async (req, res, next) => {
    try {
        const resultado = await invInventarioService.registrarMovimiento({
            ...req.body,
            idEmpresa: req.tenantId,
            idUsuario: req.userId
        });
        return sendResponse(res, 201, true, 'Movimiento registrado correctamente', {
            movimiento: resultado.movimiento,
            stock: resultado.stock.resumen()
        });
    } catch (error) {
        logger.error(`Error al registrar movimiento: ${error.message}`);
        if (error.message.includes('Stock insuficiente')) {
            return sendResponse(res, 409, false, error.message);
        }
        next(error);
    }
};

/**
 * POST /api/inv/ajuste
 * Ajusta el stock por conteo físico
 */
const ajustarPorConteo = async (req, res, next) => {
    try {
        const resultado = await invInventarioService.ajustarPorConteo({
            ...req.body,
            idEmpresa: req.tenantId,
            idUsuario: req.userId
        });
        return sendResponse(res, 200, true,
            resultado.ajustado ? 'Ajuste realizado correctamente' : resultado.mensaje,
            resultado
        );
    } catch (error) {
        logger.error(`Error al ajustar inventario: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inv/kardex/:idArticulo
 * Historial de movimientos de un artículo
 */
const obtenerKardex = async (req, res, next) => {
    try {
        const filtros = {
            tipo: req.query.tipo,
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta,
            pagina: req.query.pagina,
            limit: req.query.limit
        };
        const resultado = await invInventarioService.obtenerKardex(req.tenantId, req.params.idArticulo, filtros);
        return sendResponse(res, 200, true, 'Kardex obtenido', resultado);
    } catch (error) {
        logger.error(`Error al obtener kardex: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inv/resumen
 * Resumen ejecutivo del inventario interno
 */
const obtenerResumen = async (req, res, next) => {
    try {
        const resumen = await invInventarioService.obtenerResumen(req.tenantId);
        return sendResponse(res, 200, true, 'Resumen del inventario', resumen);
    } catch (error) {
        logger.error(`Error al obtener resumen: ${error.message}`);
        next(error);
    }
};
/**
 * POST /api/inv/transferencias
 * Transfiere stock de un artículo entre dos bodegas
 */
const transferir = async (req, res, next) => {
    try {
        const resultado = await invInventarioService.transferirEntreBodegas({
            ...req.body,
            idEmpresa: req.tenantId,
            idUsuario: req.userId
        });
        return sendResponse(res, 200, true, 'Transferencia realizada correctamente', resultado);
    } catch (error) {
        logger.error(`Error al transferir: ${error.message}`);
        if (error.message.includes('insuficiente') || error.message.includes('no pueden ser la misma')) {
            return sendResponse(res, 409, false, error.message);
        }
        next(error);
    }
};

module.exports = {
    registrarMovimiento,
    ajustarPorConteo,
    obtenerKardex,
    obtenerResumen,
    transferir
};