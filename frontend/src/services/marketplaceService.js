import api from './api';

/**
 * Servicio del Marketplace público.
 */
const marketplaceService = {
    // Tiendas
    listarTiendas: (params = {}) =>
        api.get('/empresas/publicas', { params }),

    obtenerTienda: (idEmpresa) =>
        api.get(`/empresas/publicas/${idEmpresa}`),

    // Productos
    listarProductos: (idEmpresa, params = {}) =>
        api.get('/productos', { params: { idEmpresa, ...params } }),

    obtenerProducto: (idProducto, idEmpresa) =>
        api.get(`/productos/${idProducto}`, { params: { idEmpresa } }),

    listarCategorias: (idEmpresa) =>
        api.get('/categorias', { params: { idEmpresa } }),

    // Reseñas
    listarResenasProducto: (idProducto) =>
        api.get(`/resenas/producto/${idProducto}`),

    // Carrito
    obtenerCarrito: (idEmpresa) =>
        api.get('/carrito', { params: { idEmpresa } }),

    agregarAlCarrito: (idEmpresa, idProducto, cantidad) =>
        api.post('/carrito/items', { idEmpresa, idProducto, cantidad }),

    actualizarCantidad: (idEmpresa, idItem, cantidad) =>
        api.put(`/carrito/items/${idItem}`, { idEmpresa, cantidad }),

    quitarDelCarrito: (idEmpresa, idItem) =>
        api.delete(`/carrito/items/${idItem}`, { params: { idEmpresa } }),

    vaciarCarrito: (idEmpresa) =>
        api.delete('/carrito', { params: { idEmpresa } })
};

export default marketplaceService;