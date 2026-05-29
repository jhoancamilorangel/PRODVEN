const inventarioService = require('../services/private/inventarioService');
const StockProducto = require('../models/StockProducto');
const Producto = require('../models/Producto');
const { construirFiltroTenant, construirPaginacion, construirMetadataPaginacion } = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * POST /api/inventario/movimientos
 * Registra un movimiento manual de inventario
 * Acceso: Admin y Producción (según tipo)
 */
const registrarMovimiento = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: {
                idProducto: req.body.idProducto,
                idEmpresa: req.tenantId,
                eliminado: false
            }
        });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const resultado = await inventarioService.registrarMovimiento({
            ...req.body,
            idEmpresa: req.tenantId,
            idUsuario: req.userId
        });

        return sendResponse(res, 201, true, 'Movimiento registrado correctamente', {
            movimiento: resultado.movimiento,
            stockActualizado: resultado.stockActualizado.resumen()
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
 * POST /api/inventario/ajuste
 * Ajusta el stock por conteo físico
 * Acceso: Solo Admin
 */
const ajustarPorConteo = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: {
                idProducto: req.body.idProducto,
                idEmpresa: req.tenantId,
                eliminado: false
            }
        });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const resultado = await inventarioService.ajustarInventarioPorConteo({
            ...req.body,
            idEmpresa: req.tenantId,
            idUsuario: req.userId
        });

        if (!resultado.ajustado) {
            return sendResponse(res, 200, true, resultado.mensaje, {
                cantidadActual: resultado.cantidadActual
            });
        }

        return sendResponse(res, 200, true, 'Ajuste realizado correctamente', {
            diferencia: resultado.diferencia,
            tipo: resultado.tipo,
            cantidadAnterior: resultado.cantidadAnterior,
            cantidadNueva: resultado.cantidadNueva,
            movimiento: resultado.movimiento
        });
    } catch (error) {
        logger.error(`Error al ajustar inventario: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inventario/kardex/:idProducto
 * Obtiene el kardex (historial) de un producto
 * Acceso: Admin, Supervisor, Producción
 */
const obtenerKardex = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: {
                idProducto: req.params.idProducto,
                idEmpresa: req.tenantId,
                eliminado: false
            }
        });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const filtros = {
            idBodega: req.query.idBodega,
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta,
            tipo: req.query.tipo,
            pagina: req.query.pagina,
            limit: req.query.limit
        };

        const resultado = await inventarioService.obtenerKardex(req.params.idProducto, filtros);

        return sendResponse(res, 200, true, 'Kardex obtenido', {
            producto: {
                idProducto: producto.idProducto,
                nombre: producto.nombre,
                codigoSku: producto.codigoSku,
                cantidadStock: parseFloat(producto.cantidadStock),
                unidadMedida: producto.unidadMedida
            },
            ...resultado
        });
    } catch (error) {
        logger.error(`Error al obtener kardex: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inventario/stock
 * Lista el stock de todos los productos con sus saldos
 * Acceso: Admin, Supervisor, Producción
 */
const listarStock = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        const filtros = construirFiltroTenant(req);
        const paginacion = construirPaginacion(req.query);

        if (req.query.idBodega) {
            filtros.idBodega = req.query.idBodega;
        }

        let whereProducto = { eliminado: false };

        if (req.query.busqueda) {
            whereProducto[Op.or] = [
                { nombre: { [Op.like]: `%${req.query.busqueda}%` } },
                { codigoSku: { [Op.like]: `%${req.query.busqueda}%` } }
            ];
        }

        const { count, rows } = await StockProducto.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_actualizacion', 'DESC']]
        });

        const idsProductos = rows.map(s => s.idProducto);
        const productos = await Producto.findAll({
            where: { idProducto: { [Op.in]: idsProductos }, ...whereProducto }
        });

        const mapaProductos = {};
        productos.forEach(p => {
            mapaProductos[p.idProducto] = p;
        });

        const stockConProducto = rows
            .filter(s => mapaProductos[s.idProducto])
            .map(s => {
                const producto = mapaProductos[s.idProducto];
                return {
                    ...s.resumen(),
                    producto: {
                        idProducto: producto.idProducto,
                        nombre: producto.nombre,
                        codigoSku: producto.codigoSku,
                        unidadMedida: producto.unidadMedida
                    }
                };
            });

        return sendResponse(res, 200, true, 'Stock obtenido', {
            stock: stockConProducto,
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar stock: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inventario/stock/producto/:idProducto
 * Obtiene el stock detallado de un producto en todas las bodegas
 */
const obtenerStockProducto = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: {
                idProducto: req.params.idProducto,
                idEmpresa: req.tenantId,
                eliminado: false
            }
        });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const stocks = await StockProducto.findAll({
            where: { idProducto: req.params.idProducto, idEmpresa: req.tenantId }
        });

        const resumenStocks = stocks.map(s => s.resumen());

        const totales = stocks.reduce((acc, s) => {
            acc.fisicaTotal += parseFloat(s.cantidadFisica);
            acc.reservadaTotal += parseFloat(s.cantidadReservada);
            acc.disponibleTotal += s.cantidadDisponible();
            acc.valorTotal += parseFloat(s.valorTotalInventario);
            return acc;
        }, { fisicaTotal: 0, reservadaTotal: 0, disponibleTotal: 0, valorTotal: 0 });

        return sendResponse(res, 200, true, 'Stock del producto', {
            producto: {
                idProducto: producto.idProducto,
                nombre: producto.nombre,
                codigoSku: producto.codigoSku,
                unidadMedida: producto.unidadMedida,
                stockMinimo: producto.stockMinimo,
                gestionaStock: producto.gestionaStock
            },
            stockPorBodega: resumenStocks,
            totales: {
                cantidadFisica: Math.round(totales.fisicaTotal * 1000) / 1000,
                cantidadReservada: Math.round(totales.reservadaTotal * 1000) / 1000,
                cantidadDisponible: Math.round(totales.disponibleTotal * 1000) / 1000,
                valorTotalInventario: Math.round(totales.valorTotal * 100) / 100
            }
        });
    } catch (error) {
        logger.error(`Error al obtener stock del producto: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inventario/stock-bajo
 * Lista los productos con stock bajo el umbral mínimo
 */
const listarStockBajo = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');

        const stocks = await StockProducto.findAll({
            where: { idEmpresa: req.tenantId }
        });

        const conStockBajo = stocks.filter(s => s.tieneStockBajo());
        const idsProductos = conStockBajo.map(s => s.idProducto);

        if (idsProductos.length === 0) {
            return sendResponse(res, 200, true, 'No hay productos con stock bajo', { productos: [] });
        }

        const productos = await Producto.findAll({
            where: {
                idProducto: { [Op.in]: idsProductos },
                eliminado: false
            }
        });

        const mapaProductos = {};
        productos.forEach(p => {
            mapaProductos[p.idProducto] = p;
        });

        const resultado = conStockBajo
            .filter(s => mapaProductos[s.idProducto])
            .map(s => {
                const producto = mapaProductos[s.idProducto];
                return {
                    ...s.resumen(),
                    producto: {
                        idProducto: producto.idProducto,
                        nombre: producto.nombre,
                        codigoSku: producto.codigoSku,
                        stockMinimo: producto.stockMinimo
                    }
                };
            });

        return sendResponse(res, 200, true, `${resultado.length} producto(s) con stock bajo`, {
            productos: resultado
        });
    } catch (error) {
        logger.error(`Error al listar stock bajo: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/inventario/resumen
 * Resumen ejecutivo del inventario de la empresa
 * Acceso: Admin, Supervisor
 */
const obtenerResumen = async (req, res, next) => {
    try {
        const resumen = await inventarioService.obtenerResumenInventario(req.tenantId);

        return sendResponse(res, 200, true, 'Resumen del inventario', resumen);
    } catch (error) {
        logger.error(`Error al obtener resumen: ${error.message} }`);
        next(error);
    }
};

module.exports = {
    registrarMovimiento,
    ajustarPorConteo,
    obtenerKardex,
    listarStock,
    obtenerStockProducto,
    listarStockBajo,
    obtenerResumen
};