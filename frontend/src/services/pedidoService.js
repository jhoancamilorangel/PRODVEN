import api from './api';

/**
 * Servicio de Pedidos.
 */
const pedidoService = {
    listar: (idEmpresa, params = {}) =>
        api.get('/pedidos', { params: { idEmpresa, ...params } }),

    obtener: (idPedido, idEmpresa) =>
        api.get(`/pedidos/${idPedido}`, { params: { idEmpresa } }),

    cambiarEstado: (idPedido, idEmpresa, nuevoEstado) =>
        api.patch(`/pedidos/${idPedido}/estado`, { idEmpresa, nuevoEstado }),

    cancelar: (idPedido, idEmpresa, motivo) =>
        api.post(`/pedidos/${idPedido}/cancelar`, { idEmpresa, motivo })
};

export default pedidoService;