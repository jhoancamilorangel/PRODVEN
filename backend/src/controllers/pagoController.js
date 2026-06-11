const Pago = require('../models/Pago');
const pagoService = require('../services/private/pagoService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * POST /api/pagos
 * Crea un pago e inicia el cobro en la pasarela
 */
const crearPago = async (req, res, next) => {
    try {
        const resultado = await pagoService.crearPago(req.body, req.tenantId, req.userId);

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('requiere') ? 400 : 402;
            return sendResponse(res, status, false, resultado.mensaje, resultado.pago || null);
        }

        return sendResponse(res, 201, true, resultado.mensaje, {
            pago: resultado.pago,
            resultadoPasarela: resultado.resultadoPasarela
        });
    } catch (error) {
        logger.error(`Error al crear pago: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pagos
 * Lista los pagos de la empresa
 */
const listarPagos = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.estado) {
            filtros.estado = req.query.estado;
        }

        if (req.query.tipoPago) {
            filtros.tipoPago = req.query.tipoPago;
        }

        if (req.query.metodo) {
            filtros.metodo = req.query.metodo;
        }

        const { count, rows } = await Pago.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_creacion', 'DESC']]
        });

        return sendResponse(res, 200, true, 'Pagos obtenidos', {
            pagos: rows.map(p => p.datosCompletos()),
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar pagos: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pagos/:id
 * Obtiene un pago con sus transacciones
 */
const obtenerPago = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idPago: req.params.id,
            eliminado: false
        });

        const pago = await Pago.findOne({ where: filtros });

        if (!pago) {
            return sendResponse(res, 404, false, 'Pago no encontrado');
        }

        const transacciones = await pagoService.obtenerTransaccionesPago(req.params.id, req.tenantId);

        return sendResponse(res, 200, true, 'Pago obtenido', {
            pago: pago.datosCompletos(),
            transacciones
        });
    } catch (error) {
        logger.error(`Error al obtener pago: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/pagos/:id/consultar-estado
 * Consulta el estado del pago directamente en la pasarela
 */
const consultarEstado = async (req, res, next) => {
    try {
        const resultado = await pagoService.consultarEstadoPago(req.params.id, req.tenantId);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, 'Estado consultado', {
            pago: resultado.pago,
            estadoPasarela: resultado.estadoPasarela
        });
    } catch (error) {
        logger.error(`Error al consultar estado: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/pagos/:id/reembolsar
 * Reembolsa un pago completado
 */
const reembolsarPago = async (req, res, next) => {
    try {
        const resultado = await pagoService.reembolsarPago(
            req.params.id,
            req.body.motivo,
            req.tenantId
        );

        if (!resultado.exito) {
            return sendResponse(res, 409, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al reembolsar pago: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearPago,
    listarPagos,
    obtenerPago,
    consultarEstado,
    reembolsarPago
};