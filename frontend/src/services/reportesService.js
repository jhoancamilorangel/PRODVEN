import api from './api';

/**
 * Servicio de Reportes.
 */
const reportesService = {
    resumen: (idEmpresa) =>
        api.get('/reportes/resumen', { params: { idEmpresa } }),

    ventas: (idEmpresa, params = {}) =>
        api.get('/reportes/ventas', { params: { idEmpresa, ...params } }),

    productosMasVendidos: (idEmpresa, params = {}) =>
        api.get('/reportes/productos-mas-vendidos', { params: { idEmpresa, ...params } }),

    pedidosPorEstado: (idEmpresa) =>
        api.get('/reportes/pedidos-por-estado', { params: { idEmpresa } })
};

export default reportesService;