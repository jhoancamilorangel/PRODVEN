import api from './api';

/**
 * Servicio de Auditoría (solo lectura).
 */
const auditoriaService = {
    listar: (idEmpresa, params = {}) =>
        api.get('/auditoria', { params: { idEmpresa, ...params } }),

    historialEntidad: (idEmpresa, entidad, idEntidad) =>
        api.get(`/auditoria/entidad/${entidad}/${idEntidad}`, { params: { idEmpresa } })
};

export default auditoriaService;