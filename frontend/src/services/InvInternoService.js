import api from './api';

/**
 * Servicio del Control de Inventario Interno (/api/inv).
 */
const invInternoService = {
    // Resumen
    obtenerResumen: () => api.get('/inv/resumen'),

    // Stock bajo
    listarStockBajo: () => api.get('/inv/stock-bajo'),

    // Artículos
    listarArticulos: (params = {}) => api.get('/inv/articulos', { params }),
    obtenerArticulo: (id) => api.get(`/inv/articulos/${id}`),
    crearArticulo: (datos) => api.post('/inv/articulos', datos),
    actualizarArticulo: (id, datos) => api.put(`/inv/articulos/${id}`, datos),
    eliminarArticulo: (id) => api.delete(`/inv/articulos/${id}`),

    // Movimientos
    registrarMovimiento: (datos) => api.post('/inv/movimientos', datos),
    ajustarPorConteo: (datos) => api.post('/inv/ajuste', datos),
    obtenerKardex: (idArticulo, params = {}) => api.get(`/inv/kardex/${idArticulo}`, { params }),

    // Categorías
    listarCategorias: () => api.get('/inv/categorias'),
    crearCategoria: (datos) => api.post('/inv/categorias', datos),
    actualizarCategoria: (id, datos) => api.put(`/inv/categorias/${id}`, datos),
    eliminarCategoria: (id) => api.delete(`/inv/categorias/${id}`),

    // Proveedores
    listarProveedores: () => api.get('/inv/proveedores'),
    crearProveedor: (datos) => api.post('/inv/proveedores', datos),
    actualizarProveedor: (id, datos) => api.put(`/inv/proveedores/${id}`, datos),
    eliminarProveedor: (id) => api.delete(`/inv/proveedores/${id}`),

    // Bodegas
    listarBodegas: () => api.get('/inv/bodegas'),
    crearBodega: (datos) => api.post('/inv/bodegas', datos),
    actualizarBodega: (id, datos) => api.put(`/inv/bodegas/${id}`, datos),
    eliminarBodega: (id) => api.delete(`/inv/bodegas/${id}`),

    // Transferencias
    transferir: (datos) => api.post('/inv/transferencias', datos),

    // Lotes
    listarLotes: (idArticulo) => api.get(`/inv/lotes/articulo/${idArticulo}`),
    crearLote: (datos) => api.post('/inv/lotes', datos),
    actualizarLote: (id, datos) => api.put(`/inv/lotes/${id}`, datos),
    eliminarLote: (id) => api.delete(`/inv/lotes/${id}`)
};

export default invInternoService;