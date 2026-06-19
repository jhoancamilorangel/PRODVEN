import api from './api';

/**
 * Servicio de Inventario.
 */
const inventarioService = {
    listarStock: (idEmpresa, params = {}) =>
        api.get('/inventario/stock', { params: { idEmpresa, ...params } }),

    stockBajo: (idEmpresa) =>
        api.get('/inventario/stock-bajo', { params: { idEmpresa } }),

    resumen: (idEmpresa) =>
        api.get('/inventario/resumen', { params: { idEmpresa } }),

    stockProducto: (idProducto, idEmpresa) =>
        api.get(`/inventario/stock/producto/${idProducto}`, { params: { idEmpresa } }),

    kardex: (idProducto, idEmpresa, params = {}) =>
        api.get(`/inventario/kardex/${idProducto}`, { params: { idEmpresa, ...params } }),

    registrarMovimiento: (datos) =>
        api.post('/inventario/movimientos', datos),

    ajustarPorConteo: (datos) =>
        api.post('/inventario/ajuste', datos)
};

export default inventarioService;