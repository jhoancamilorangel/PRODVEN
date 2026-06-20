import api from './api';

/**
 * Servicio de Producción: órdenes de producción y recetas (BOM).
 */
const produccionService = {
    // Órdenes de producción
    listarOrdenes: (idEmpresa, params = {}) =>
        api.get('/ordenes-produccion', { params: { idEmpresa, ...params } }),

    obtenerOrden: (id, idEmpresa) =>
        api.get(`/ordenes-produccion/${id}`, { params: { idEmpresa } }),

    crearOrden: (datos) =>
        api.post('/ordenes-produccion', datos),

    iniciarOrden: (id, idEmpresa) =>
        api.patch(`/ordenes-produccion/${id}/iniciar`, { idEmpresa }),

    completarOrden: (id, datos) =>
        api.patch(`/ordenes-produccion/${id}/completar`, datos),

    cancelarOrden: (id, idEmpresa, motivo) =>
        api.patch(`/ordenes-produccion/${id}/cancelar`, { idEmpresa, motivo }),

    // Recetas (BOM)
    listarRecetas: (idEmpresa, params = {}) =>
        api.get('/bom', { params: { idEmpresa, ...params } }),

    obtenerReceta: (id, idEmpresa) =>
        api.get(`/bom/${id}`, { params: { idEmpresa } }),

    crearReceta: (datos) =>
        api.post('/bom', datos),

    activarReceta: (id, idEmpresa) =>
        api.patch(`/bom/${id}/activar`, { idEmpresa }),

    eliminarReceta: (id) =>
        api.delete(`/bom/${id}`),

    agregarComponente: (idBom, datos) =>
        api.post(`/bom/${idBom}/componentes`, datos),

    eliminarComponente: (idBom, idComp, idEmpresa) =>
        api.delete(`/bom/${idBom}/componentes/${idComp}`, { params: { idEmpresa } })
};

export default produccionService;