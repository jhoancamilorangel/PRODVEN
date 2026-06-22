import api from './api';

/**
 * Servicio del Marketplace público (no requiere autenticación).
 */
const marketplaceService = {
    // Vitrina: todas las tiendas públicas
    listarTiendas: (params = {}) =>
        api.get('/empresas/publicas', { params }),

    // Una tienda específica
    obtenerTienda: (idEmpresa) =>
        api.get(`/empresas/publicas/${idEmpresa}`),

    // Productos de una tienda (público)
    listarProductos: (idEmpresa, params = {}) =>
        api.get('/productos', { params: { idEmpresa, ...params } }),

    // Categorías de una tienda
    listarCategorias: (idEmpresa) =>
        api.get('/categorias', { params: { idEmpresa } })
};

export default marketplaceService;