import api from './api';

/**
 * Servicio del Control de Inventario Interno (módulo independiente).
 * Consume /api/inv (separado del inventario de ventas).
 */
const invInternoService = {
    // Resumen ejecutivo
    obtenerResumen: () =>
        api.get('/inv/resumen'),

    // Artículos
    listarArticulos: (params = {}) =>
        api.get('/inv/articulos', { params }),

    obtenerArticulo: (idArticulo) =>
        api.get(`/inv/articulos/${idArticulo}`),

    crearArticulo: (datos) =>
        api.post('/inv/articulos', datos),

    actualizarArticulo: (idArticulo, datos) =>
        api.put(`/inv/articulos/${idArticulo}`, datos),

    eliminarArticulo: (idArticulo) =>
        api.delete(`/inv/articulos/${idArticulo}`),

    // Movimientos y ajustes
    registrarMovimiento: (datos) =>
        api.post('/inv/movimientos', datos),

    ajustarPorConteo: (datos) =>
        api.post('/inv/ajuste', datos),

    // Kardex
    obtenerKardex: (idArticulo, params = {}) =>
        api.get(`/inv/kardex/${idArticulo}`, { params })
};

export default invInternoService;