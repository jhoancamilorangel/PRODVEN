import api from './api';

/**
 * Servicio de Engagement: reseñas, promociones y notificaciones.
 */
const engagementService = {
    // Reseñas
    listarResenasProducto: (idProducto) =>
        api.get(`/resenas/producto/${idProducto}`),

    cambiarVisibilidadResena: (id, idEmpresa, visible) =>
        api.patch(`/resenas/${id}/visibilidad`, { idEmpresa, visible }),

    // Promociones
    listarPromociones: (idEmpresa, params = {}) =>
        api.get('/promociones', { params: { idEmpresa, ...params } }),

    crearPromocion: (datos) =>
        api.post('/promociones', datos),

    actualizarPromocion: (id, datos) =>
        api.put(`/promociones/${id}`, datos),

    desactivarPromocion: (id, idEmpresa) =>
        api.delete(`/promociones/${id}`, { params: { idEmpresa } }),

    // Notificaciones
    listarNotificaciones: (params = {}) =>
        api.get('/notificaciones', { params }),

    marcarLeida: (id) =>
        api.patch(`/notificaciones/${id}/leer`),

    marcarTodasLeidas: () =>
        api.patch('/notificaciones/leer-todas')
};

export default engagementService;