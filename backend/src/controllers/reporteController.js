const reporteService = require('../services/private/reporteService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * GET /api/reportes/ventas
 * Reporte de ventas por período
 */
const ventasPorPeriodo = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await reporteService.ventasPorPeriodo(idEmpresa, {
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta
        });

        return sendResponse(res, 200, true, 'Reporte de ventas', resultado);
    } catch (error) {
        logger.error(`Error en reporte de ventas: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/reportes/productos-mas-vendidos
 * Ranking de productos más vendidos
 */
const productosMasVendidos = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await reporteService.productosMasVendidos(idEmpresa, {
            limite: req.query.limite,
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta
        });

        return sendResponse(res, 200, true, 'Productos más vendidos', resultado);
    } catch (error) {
        logger.error(`Error en reporte de productos: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/reportes/pedidos-por-estado
 * Conteo de pedidos por estado
 */
const pedidosPorEstado = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await reporteService.pedidosPorEstado(idEmpresa);

        return sendResponse(res, 200, true, 'Pedidos por estado', resultado);
    } catch (error) {
        logger.error(`Error en reporte de pedidos por estado: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/reportes/resumen
 * Resumen general del negocio (dashboard)
 */
const resumenGeneral = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await reporteService.resumenGeneral(idEmpresa);

        return sendResponse(res, 200, true, 'Resumen general', resultado);
    } catch (error) {
        logger.error(`Error en resumen general: ${error.message}`);
        next(error);
    }
};

module.exports = {
    ventasPorPeriodo,
    productosMasVendidos,
    pedidosPorEstado,
    resumenGeneral
};