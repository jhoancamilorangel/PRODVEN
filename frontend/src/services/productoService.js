import api from './api';

/**
 * Servicio de Productos. Centraliza las llamadas al backend
 * relacionadas con productos e imágenes.
 */
const productoService = {
    listar: (idEmpresa, params = {}) =>
        api.get('/productos', { params: { idEmpresa, ...params } }),

    obtener: (id, idEmpresa) =>
        api.get(`/productos/${id}`, { params: { idEmpresa } }),

    crear: (datos) =>
        api.post('/productos', datos),

    actualizar: (id, datos) =>
        api.put(`/productos/${id}`, datos),

    eliminar: (id) =>
        api.delete(`/productos/${id}`),

    togglePublicacion: (id, activar) =>
        api.patch(`/productos/${id}/publicar`, { activar }),

    toggleDestacado: (id, activar) =>
        api.patch(`/productos/${id}/destacar`, { activar }),

    toggleOferta: (id, activar, precioOferta) =>
        api.patch(`/productos/${id}/oferta`, { activar, precioOferta }),

    // ===== IMÁGENES =====
    listarImagenes: (idProducto) =>
        api.get(`/productos/${idProducto}/imagenes`),

    subirImagen: (idProducto, archivo) => {
        const formData = new FormData();
        formData.append('imagen', archivo);
        return api.post(`/productos/${idProducto}/imagenes`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
    },

    eliminarImagen: (idProducto, idImagen) =>
        api.delete(`/productos/${idProducto}/imagenes/${idImagen}`),

    marcarImagenPrincipal: (idProducto, idImagen) =>
        api.patch(`/productos/${idProducto}/imagenes/${idImagen}/principal`)
};

export default productoService;