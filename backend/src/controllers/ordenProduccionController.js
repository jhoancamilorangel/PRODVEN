const OrdenProduccion = require('../models/OrdenProduccion');
const produccionService = require('../services/private/produccionService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * POST /api/ordenes-produccion
 * Crea una nueva orden de producción (Admin, Producción)
 */
const crearOrden = async (req, res, next) => {
    try {
        const resultado = await produccionService.crearOrdenProduccion(req.body, req.tenantId, req.userId);

        return sendResponse(res, 201, true, resultado.mensaje, {
            orden: resultado.orden.resumen(),
            verificacionMateriales: resultado.verificacion
        });
    } catch (error) {
        logger.error(`Error al crear orden: ${error.message}`);
        if (error.message.includes('no encontrado') || error.message.includes('fabricado') || error.message.includes('receta')) {
            return sendResponse(res, 400, false, error.message);
        }
        next(error);
    }
};

/**
 * GET /api/ordenes-produccion
 * Lista las órdenes de producción de la empresa
 */
const listarOrdenes = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.estado) {
            filtros.estado = req.query.estado;
        }

        if (req.query.idProducto) {
            filtros.idProducto = req.query.idProducto;
        }

        if (req.query.prioridad) {
            filtros.prioridad = req.query.prioridad;
        }

        const { count, rows } = await OrdenProduccion.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_creacion', 'DESC']]
        });

        return sendResponse(res, 200, true, 'Órdenes de producción obtenidas', {
            ordenes: rows.map(o => o.resumen()),
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar órdenes: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/ordenes-produccion/:id
 * Obtiene una orden de producción específica con sus consumos
 */
const obtenerOrden = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idOrden: req.params.id,
            eliminado: false
        });

        const orden = await OrdenProduccion.findOne({ where: filtros });

        if (!orden) {
            return sendResponse(res, 404, false, 'Orden de producción no encontrada');
        }

        const consumos = await produccionService.obtenerConsumosOrden(orden.idOrden, req.tenantId);

        return sendResponse(res, 200, true, 'Orden de producción obtenida', {
            orden: orden.datosCompletos(),
            consumos
        });
    } catch (error) {
        logger.error(`Error al obtener orden: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/ordenes-produccion/:id/verificar-materiales
 * Verifica si hay materiales suficientes para una orden
 */
const verificarMateriales = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idOrden: req.params.id,
            eliminado: false
        });

        const orden = await OrdenProduccion.findOne({ where: filtros });

        if (!orden) {
            return sendResponse(res, 404, false, 'Orden de producción no encontrada');
        }

        const verificacion = await produccionService.verificarDisponibilidadMateriales(
            orden.idBom,
            parseFloat(orden.cantidadProducir),
            req.tenantId,
            orden.idBodega
        );

        return sendResponse(res, 200, true, 'Verificación de materiales', verificacion);
    } catch (error) {
        logger.error(`Error al verificar materiales: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/ordenes-produccion/:id/iniciar
 * Inicia la producción consumiendo los materiales (Admin, Producción)
 */
const iniciarOrden = async (req, res, next) => {
    try {
        const resultado = await produccionService.iniciarProduccion(req.params.id, req.tenantId, req.userId);

        if (!resultado.exito) {
            return sendResponse(res, 409, false, resultado.mensaje, {
                faltantes: resultado.faltantes
            });
        }

        return sendResponse(res, 200, true, resultado.mensaje, {
            orden: resultado.orden.resumen(),
            consumos: resultado.consumos
        });
    } catch (error) {
        logger.error(`Error al iniciar orden: ${error.message}`);
        if (error.message.includes('estado') || error.message.includes('no encontrada')) {
            return sendResponse(res, 409, false, error.message);
        }
        next(error);
    }
};

/**
 * PATCH /api/ordenes-produccion/:id/completar
 * Completa la producción ingresando el producto terminado (Admin, Producción)
 */
const completarOrden = async (req, res, next) => {
    try {
        const datos = {
            idOrden: req.params.id,
            cantidadProducida: req.body.cantidadProducida,
            cantidadDefectuosa: req.body.cantidadDefectuosa,
            mermas: req.body.mermas,
            costoManoObra: req.body.costoManoObra,
            costoIndirecto: req.body.costoIndirecto
        };

        const resultado = await produccionService.completarProduccion(datos, req.tenantId, req.userId);

        return sendResponse(res, 200, true, resultado.mensaje, {
            orden: resultado.orden
        });
    } catch (error) {
        logger.error(`Error al completar orden: ${error.message}`);
        if (error.message.includes('estado') || error.message.includes('no encontrada') || error.message.includes('cantidad')) {
            return sendResponse(res, 409, false, error.message);
        }
        next(error);
    }
};

/**
 * PATCH /api/ordenes-produccion/:id/cancelar
 * Cancela una orden revirtiendo materiales si es necesario (Admin, Producción)
 */
const cancelarOrden = async (req, res, next) => {
    try {
        const resultado = await produccionService.cancelarOrden(
            req.params.id,
            req.body.motivo,
            req.tenantId,
            req.userId
        );

        return sendResponse(res, 200, true, resultado.mensaje, {
            orden: resultado.orden
        });
    } catch (error) {
        logger.error(`Error al cancelar orden: ${error.message}`);
        if (error.message.includes('estado') || error.message.includes('no encontrada') || error.message.includes('motivo')) {
            return sendResponse(res, 409, false, error.message);
        }
        next(error);
    }
};

module.exports = {
    crearOrden,
    listarOrdenes,
    obtenerOrden,
    verificarMateriales,
    iniciarOrden,
    completarOrden,
    cancelarOrden
};