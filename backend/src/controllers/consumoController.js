const ConsumoOrden = require('../models/ConsumoOrden');
const OrdenProduccion = require('../models/OrdenProduccion');
const Producto = require('../models/Producto');
const produccionService = require('../services/private/produccionService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/consumos
 * Lista los consumos de producción de la empresa con filtros
 */
const listarConsumos = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req);
        const paginacion = construirPaginacion(req.query);

        if (req.query.idProductoComponente) {
            filtros.idProductoComponente = req.query.idProductoComponente;
        }

        if (req.query.idOrden) {
            filtros.idOrden = req.query.idOrden;
        }

        const { count, rows } = await ConsumoOrden.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_creacion', 'DESC']]
        });

        return sendResponse(res, 200, true, 'Consumos obtenidos', {
            consumos: rows.map(c => c.datosCompletos()),
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar consumos: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/consumos/orden/:idOrden
 * Obtiene los consumos de una orden específica con resumen
 */
const obtenerConsumosPorOrden = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idOrden: req.params.idOrden,
            eliminado: false
        });

        const orden = await OrdenProduccion.findOne({ where: filtros });

        if (!orden) {
            return sendResponse(res, 404, false, 'Orden de producción no encontrada');
        }

        const consumos = await produccionService.obtenerConsumosOrden(orden.idOrden, req.tenantId);

        const totalCosto = consumos.reduce((acc, c) => acc + c.costoTotal, 0);

        return sendResponse(res, 200, true, 'Consumos de la orden', {
            orden: {
                idOrden: orden.idOrden,
                numeroOrden: orden.numeroOrden,
                estado: orden.estado,
                cantidadProducir: parseFloat(orden.cantidadProducir)
            },
            totalCosto: Math.round(totalCosto * 100) / 100,
            cantidadComponentes: consumos.length,
            consumos
        });
    } catch (error) {
        logger.error(`Error al obtener consumos de orden: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/consumos/reporte-mes
 * Reporte de consumos del mes agrupado por material
 */
const reporteMensual = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');

        const ahora = new Date();
        const anio = parseInt(req.query.anio, 10) || ahora.getFullYear();
        const mes = parseInt(req.query.mes, 10) || (ahora.getMonth() + 1);

        const inicioMes = new Date(anio, mes - 1, 1);
        const finMes = new Date(anio, mes, 0, 23, 59, 59);

        const consumos = await ConsumoOrden.findAll({
            where: {
                idEmpresa: req.tenantId,
                fecha_creacion: {
                    [Op.gte]: inicioMes,
                    [Op.lte]: finMes
                }
            }
        });

        const agrupado = {};
        let costoTotalMes = 0;

        for (const consumo of consumos) {
            const id = consumo.idProductoComponente;

            if (!agrupado[id]) {
                agrupado[id] = {
                    idProductoComponente: id,
                    nombreProducto: null,
                    cantidadTotal: 0,
                    costoTotal: 0,
                    numeroConsumos: 0
                };
            }

            agrupado[id].cantidadTotal += parseFloat(consumo.cantidadConsumida);
            agrupado[id].costoTotal += parseFloat(consumo.costoTotal);
            agrupado[id].numeroConsumos += 1;
            costoTotalMes += parseFloat(consumo.costoTotal);
        }

        const idsProductos = Object.keys(agrupado);
        if (idsProductos.length > 0) {
            const productos = await Producto.findAll({
                where: { idProducto: { [Op.in]: idsProductos } }
            });

            for (const producto of productos) {
                if (agrupado[producto.idProducto]) {
                    agrupado[producto.idProducto].nombreProducto = producto.nombre;
                }
            }
        }

        const materiales = Object.values(agrupado).map(m => ({
            ...m,
            cantidadTotal: Math.round(m.cantidadTotal * 10000) / 10000,
            costoTotal: Math.round(m.costoTotal * 100) / 100
        }));

        materiales.sort((a, b) => b.costoTotal - a.costoTotal);

        return sendResponse(res, 200, true, 'Reporte de consumos del mes', {
            periodo: { anio, mes },
            costoTotalMes: Math.round(costoTotalMes * 100) / 100,
            totalMateriales: materiales.length,
            materiales
        });
    } catch (error) {
        logger.error(`Error al generar reporte mensual: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarConsumos,
    obtenerConsumosPorOrden,
    reporteMensual
};