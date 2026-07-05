import api from './api';

/**
 * Servicio de Solicitudes de Negocio (frontend)
 *
 * Conecta con los endpoints del onboarding de vendedores.
 * - crear: la usa el cliente desde el marketplace.
 * - listar / contarPendientes / aprobar / rechazar: las usa el superadmin
 *   desde el panel.
 */
const solicitudNegocioService = {
    /**
     * Un cliente crea su solicitud para convertirse en negocio.
     * @param {object} datos - { nombreNegocio, categoria, telefono, ciudad, departamento, descripcion }
     */
    crear: (datos) =>
        api.post('/solicitudes-negocio', datos),

    /**
     * Lista solicitudes (superadmin). Filtro opcional { estado, pagina, limit }.
     */
    listar: (params = {}) =>
        api.get('/solicitudes-negocio', { params }),

    /**
     * Conteo de solicitudes pendientes (badge del panel superadmin).
     */
    contarPendientes: () =>
        api.get('/solicitudes-negocio/pendientes/contar'),

    /**
     * Aprueba una solicitud (superadmin).
     */
    aprobar: (idSolicitud) =>
        api.patch(`/solicitudes-negocio/${idSolicitud}/aprobar`),

    /**
     * Rechaza una solicitud con motivo (superadmin).
     */
    rechazar: (idSolicitud, motivo) =>
        api.patch(`/solicitudes-negocio/${idSolicitud}/rechazar`, { motivo })
};

export default solicitudNegocioService;