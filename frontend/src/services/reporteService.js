import api from './api';

/**
 * Servicio de reportes del dashboard.
 * Consume los endpoints de reportes del backend.
 */
const reporteService = {
    resumenGeneral: (idEmpresa) =>
        api.get('/reportes/resumen', { params: { idEmpresa } }),

    ventasPorPeriodo: (idEmpresa, fechaDesde, fechaHasta) =>
        api.get('/reportes/ventas', { params: { idEmpresa, fechaDesde, fechaHasta } }),

    productosMasVendidos: (idEmpresa, limite = 5) =>
        api.get('/reportes/productos-mas-vendidos', { params: { idEmpresa, limite } }),

    pedidosPorEstado: (idEmpresa) =>
        api.get('/reportes/pedidos-por-estado', { params: { idEmpresa } })
};

export default reporteService;