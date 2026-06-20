import api from './api';

/**
 * Servicio de Pagos.
 */
const pagoService = {
    listar: (idEmpresa, params = {}) =>
        api.get('/pagos', { params: { idEmpresa, ...params } }),

    obtener: (id, idEmpresa) =>
        api.get(`/pagos/${id}`, { params: { idEmpresa } }),

    consultarEstado: (id, idEmpresa) =>
        api.get(`/pagos/${id}/consultar-estado`, { params: { idEmpresa } }),

    reembolsar: (id, idEmpresa, motivo) =>
        api.post(`/pagos/${id}/reembolsar`, { idEmpresa, motivo })
};

export default pagoService;