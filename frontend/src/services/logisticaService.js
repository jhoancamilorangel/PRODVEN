import api from './api';

/**
 * Servicio de Logística: domiciliarios y zonas de cobertura.
 */
const logisticaService = {
    // Domiciliarios
    listarDomiciliarios: (idEmpresa) =>
        api.get('/domiciliarios', { params: { idEmpresa } }),

    listarDisponibles: (idEmpresa) =>
        api.get('/domiciliarios/disponibles', { params: { idEmpresa } }),

    crearDomiciliario: (datos) =>
        api.post('/domiciliarios', datos),

    actualizarDomiciliario: (id, datos) =>
        api.put(`/domiciliarios/${id}`, datos),

    cambiarDisponibilidad: (id, idEmpresa, disponible) =>
        api.patch(`/domiciliarios/${id}/disponibilidad`, { idEmpresa, disponible }),

    desactivarDomiciliario: (id, idEmpresa) =>
        api.delete(`/domiciliarios/${id}`, { params: { idEmpresa } }),

    // Zonas de cobertura
    listarZonas: (idEmpresa) =>
        api.get('/zonas', { params: { idEmpresa } }),

    crearZona: (datos) =>
        api.post('/zonas', datos),

    actualizarZona: (id, datos) =>
        api.put(`/zonas/${id}`, datos),

    desactivarZona: (id, idEmpresa) =>
        api.delete(`/zonas/${id}`, { params: { idEmpresa } })
};

export default logisticaService;