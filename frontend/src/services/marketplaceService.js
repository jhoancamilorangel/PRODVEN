import api from './api';

/**
 * Servicio del Marketplace público.
 * Usa endpoints públicos (sin autenticación de empresa).
 */
const marketplaceService = {
    // Tiendas
    listarTiendas: (params = {}) =>
        api.get('/empresas/publicas', { params }),

    obtenerTienda: (idEmpresa) =>
        api.get(`/empresas/publicas/${idEmpresa}`),

    // Productos (PÚBLICOS)
    listarProductos: (idEmpresa, params = {}) =>
        api.get('/productos/publicos', { params: { idEmpresa, ...params } }),

    obtenerProducto: (idProducto) =>
        api.get(`/productos/publicos/${idProducto}`),

    // Reseñas
    listarResenasProducto: (idProducto) =>
        api.get(`/resenas/producto/${idProducto}`),

    // Carrito
    obtenerCarrito: (idEmpresa) =>
        api.get('/carrito', { params: { idEmpresa } }),

    obtenerTodosLosCarritos: () =>
        api.get('/carrito/todos'),

    agregarAlCarrito: (idEmpresa, idProducto, cantidad) =>
        api.post('/carrito/items', { idEmpresa, idProducto, cantidad }),

    actualizarCantidad: (idEmpresa, idItem, cantidad) =>
        api.put(`/carrito/items/${idItem}`, { idEmpresa, cantidad }),

    quitarDelCarrito: (idEmpresa, idItem) =>
        api.delete(`/carrito/items/${idItem}`, { params: { idEmpresa } }),

    vaciarCarrito: (idEmpresa) =>
        api.delete('/carrito', { params: { idEmpresa } }),

    // Configuración pública de la tienda (métodos de pago, costo domicilio, etc.)
    obtenerConfiguracionTienda: (idEmpresa) =>
        api.get(`/configuracion/publica/${idEmpresa}`),

    // Pedidos (checkout)
    crearPedido: (idEmpresa, datos) =>
        api.post('/pedidos', { idEmpresa, ...datos }),

    pagarPedido: (idPedido, datos) =>
        api.post(`/pedidos/${idPedido}/pagar`, datos),

    cancelarPedido: (idPedido, motivo = 'Cancelado por el cliente') =>
        api.post(`/pedidos/${idPedido}/cancelar`, { motivo }),

    misCompras: (params = {}) =>
        api.get('/pedidos/mis-compras', { params }),
    detalleMiCompra: (idPedido) =>
        api.get(`/pedidos/mis-compras/${idPedido}`),
};

export default marketplaceService;