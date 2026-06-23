import api from './api';

/**
 * Servicio del módulo de Inventario (panel administrativo).
 * Control de inventario independiente: existencias, movimientos, kardex.
 */
const inventarioService = {
    // Resumen ejecutivo del inventario
    obtenerResumen: () =>
        api.get('/inventario/resumen'),

    // Listado de stock de todos los productos (con búsqueda y filtro de bodega)
    listarStock: (params = {}) =>
        api.get('/inventario/stock', { params }),

    // Stock detallado de un producto en todas las bodegas
    obtenerStockProducto: (idProducto) =>
        api.get(`/inventario/stock/producto/${idProducto}`),

    // Productos con stock bajo
    listarStockBajo: () =>
        api.get('/inventario/stock-bajo'),

    // Kardex (historial de movimientos) de un producto
    obtenerKardex: (idProducto, params = {}) =>
        api.get(`/inventario/kardex/${idProducto}`, { params }),

    // Registrar movimiento manual (entrada/salida)
    registrarMovimiento: (datos) =>
        api.post('/inventario/movimientos', datos),

    // Ajuste por conteo físico
    ajustarPorConteo: (datos) =>
        api.post('/inventario/ajuste', datos),

    // Crear un artículo de inventario (usa el endpoint de productos)
    // Se crea como interno: publicado queda false por defecto en el backend
    crearArticulo: (datos) =>
        api.post('/productos', { precioVenta: 0, ...datos })
};

export default inventarioService;