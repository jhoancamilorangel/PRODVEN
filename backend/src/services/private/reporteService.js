const Pedido = require('../../models/Pedido');
const DetallePedido = require('../../models/DetallePedido');
const Producto = require('../../models/Producto');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');
const { Op, fn, col, literal } = require('sequelize');

/**
 * Servicio de Reportes (al vuelo)
 *
 * Genera reportes leyendo y resumiendo los datos existentes. No crea datos
 * nuevos ni guarda archivos: devuelve los resúmenes en JSON, listos para
 * alimentar un dashboard.
 *
 * La generación de reportes como archivo (PDF/Excel) usando la tabla
 * 'reportes' se hará junto con el frontend.
 *
 * Criterio de ventas:
 *  - Venta consumada: pedidos en estado 'entregado'
 *  - Venta en proceso: 'confirmado', 'en_preparacion', 'en_camino'
 */

const ESTADOS_VENTA_CONSUMADA = ['entregado'];
const ESTADOS_VENTA_PROCESO = ['confirmado', 'en_preparacion', 'en_camino'];

// =====================================================
// VENTAS POR PERÍODO
// =====================================================

/**
 * Reporte de ventas en un rango de fechas
 *
 * @param {string} idEmpresa
 * @param {object} filtros - { fechaDesde, fechaHasta }
 * @returns {Promise<object>} resumen de ventas
 */
const ventasPorPeriodo = async (idEmpresa, filtros = {}) => {
    const where = {
        idEmpresa,
        eliminado: false,
        estado: { [Op.in]: ESTADOS_VENTA_CONSUMADA }
    };

    // Filtro de fechas opcional (sobre fecha_pedido)
    if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fechaPedido = {};
        if (filtros.fechaDesde) where.fechaPedido[Op.gte] = new Date(filtros.fechaDesde);
        if (filtros.fechaHasta) where.fechaPedido[Op.lte] = new Date(filtros.fechaHasta);
    }

    const resultado = await Pedido.findOne({
        where,
        attributes: [
            [fn('COUNT', col('id_pedido')), 'totalPedidos'],
            [fn('COALESCE', fn('SUM', col('total')), 0), 'totalVentas'],
            [fn('COALESCE', fn('AVG', col('total')), 0), 'ticketPromedio']
        ],
        raw: true
    });

    return {
        periodo: {
            desde: filtros.fechaDesde || 'inicio',
            hasta: filtros.fechaHasta || 'hoy'
        },
        totalPedidos: parseInt(resultado.totalPedidos, 10) || 0,
        totalVentas: parseFloat(resultado.totalVentas) || 0,
        ticketPromedio: Math.round((parseFloat(resultado.ticketPromedio) || 0) * 100) / 100
    };
};

// =====================================================
// PRODUCTOS MÁS VENDIDOS
// =====================================================

/**
 * Ranking de productos más vendidos (por cantidad)
 * Considera solo pedidos de venta consumada
 */
const productosMasVendidos = async (idEmpresa, filtros = {}) => {
    const limite = parseInt(filtros.limite, 10) || 10;

    // Pedidos consumados de la empresa (para filtrar los detalles)
    const wherePedido = {
        idEmpresa,
        eliminado: false,
        estado: { [Op.in]: ESTADOS_VENTA_CONSUMADA }
    };

    if (filtros.fechaDesde || filtros.fechaHasta) {
        wherePedido.fechaPedido = {};
        if (filtros.fechaDesde) wherePedido.fechaPedido[Op.gte] = new Date(filtros.fechaDesde);
        if (filtros.fechaHasta) wherePedido.fechaPedido[Op.lte] = new Date(filtros.fechaHasta);
    }

    const pedidos = await Pedido.findAll({
        where: wherePedido,
        attributes: ['idPedido'],
        raw: true
    });

    const idsPedidos = pedidos.map(p => p.idPedido);

    if (idsPedidos.length === 0) {
        return { productos: [] };
    }

    // Agrupar los detalles por producto, sumando cantidades
    const ranking = await DetallePedido.findAll({
        where: { idPedido: { [Op.in]: idsPedidos } },
        attributes: [
            'idProducto',
            [fn('SUM', col('cantidad')), 'cantidadVendida'],
            [fn('SUM', col('subtotal')), 'totalGenerado']
        ],
        group: ['idProducto'],
        order: [[literal('cantidadVendida'), 'DESC']],
        limit: limite,
        raw: true
    });

    // Enriquecer con el nombre del producto
    const productos = [];
    for (const fila of ranking) {
        const producto = await Producto.findByPk(fila.idProducto, { attributes: ['nombre'] });
        productos.push({
            idProducto: fila.idProducto,
            nombre: producto ? producto.nombre : 'Producto desconocido',
            cantidadVendida: parseInt(fila.cantidadVendida, 10) || 0,
            totalGenerado: parseFloat(fila.totalGenerado) || 0
        });
    }

    return { productos };
};

// =====================================================
// PEDIDOS POR ESTADO
// =====================================================

/**
 * Cuenta los pedidos agrupados por estado
 */
const pedidosPorEstado = async (idEmpresa) => {
    const filas = await Pedido.findAll({
        where: { idEmpresa, eliminado: false },
        attributes: [
            'estado',
            [fn('COUNT', col('id_pedido')), 'cantidad']
        ],
        group: ['estado'],
        raw: true
    });

    // Armar un objeto con todos los estados (incluso los que tienen 0)
    const todosLosEstados = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado', 'reembolsado'];
    const conteo = {};
    for (const estado of todosLosEstados) {
        conteo[estado] = 0;
    }
    for (const fila of filas) {
        conteo[fila.estado] = parseInt(fila.cantidad, 10) || 0;
    }

    return { porEstado: conteo };
};

// =====================================================
// RESUMEN GENERAL (DASHBOARD)
// =====================================================

/**
 * Resumen con los números clave del negocio (foto rápida)
 */
const resumenGeneral = async (idEmpresa) => {
    // Ventas consumadas (total histórico)
    const ventasConsumadas = await Pedido.findOne({
        where: {
            idEmpresa,
            eliminado: false,
            estado: { [Op.in]: ESTADOS_VENTA_CONSUMADA }
        },
        attributes: [
            [fn('COUNT', col('id_pedido')), 'pedidos'],
            [fn('COALESCE', fn('SUM', col('total')), 0), 'total']
        ],
        raw: true
    });

    // Ventas en proceso
    const ventasProceso = await Pedido.findOne({
        where: {
            idEmpresa,
            eliminado: false,
            estado: { [Op.in]: ESTADOS_VENTA_PROCESO }
        },
        attributes: [
            [fn('COUNT', col('id_pedido')), 'pedidos'],
            [fn('COALESCE', fn('SUM', col('total')), 0), 'total']
        ],
        raw: true
    });

    // Pedidos pendientes de atender
    const pendientes = await Pedido.count({
        where: { idEmpresa, eliminado: false, estado: 'pendiente' }
    });

    return {
        ventasConsumadas: {
            pedidos: parseInt(ventasConsumadas.pedidos, 10) || 0,
            total: parseFloat(ventasConsumadas.total) || 0
        },
        ventasEnProceso: {
            pedidos: parseInt(ventasProceso.pedidos, 10) || 0,
            total: parseFloat(ventasProceso.total) || 0
        },
        pedidosPendientes: pendientes
    };
};

module.exports = {
    ventasPorPeriodo,
    productosMasVendidos,
    pedidosPorEstado,
    resumenGeneral
};