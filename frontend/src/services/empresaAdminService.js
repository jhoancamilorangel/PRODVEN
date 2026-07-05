import api from './api';

/**
 * Servicio de Administración de Empresas (frontend, superadmin)
 *
 * Conecta con los endpoints de gestión de empresas y sus suscripciones.
 * Las acciones de estado (activar/desactivar/suspender) van a /empresas.
 * Las acciones de plan (cortesía, cambiar plan) van a /suscripciones.
 *
 * Ojo con los IDs:
 *  - cortesia / quitarCortesia usan el idEmpresa.
 *  - cambiarPlan / suspenderSuscripcion usan el idSuscripcion.
 */
const empresaAdminService = {
    // ----- Listado -----
    listar: (params = {}) =>
        api.get('/empresas', { params }),

    obtenerEstadisticas: () =>
        api.get('/empresas/estadisticas/globales'),

    // ----- Acciones de estado de la empresa (idEmpresa) -----
    activar: (idEmpresa) =>
        api.patch(`/empresas/${idEmpresa}/activar`),

    desactivar: (idEmpresa) =>
        api.patch(`/empresas/${idEmpresa}/desactivar`),

    suspender: (idEmpresa, motivo) =>
        api.patch(`/empresas/${idEmpresa}/suspender`, { motivo }),

    // ----- Cortesía (idEmpresa) -----
    activarCortesia: (idEmpresa) =>
        api.patch(`/suscripciones/${idEmpresa}/cortesia`),

    quitarCortesia: (idEmpresa) =>
        api.patch(`/suscripciones/${idEmpresa}/quitar-cortesia`),

    // ----- Cambio de plan (idSuscripcion) -----
    cambiarPlan: (idSuscripcion, plan) =>
        api.put(`/suscripciones/${idSuscripcion}/cambiar-plan`, { plan })
};

export default empresaAdminService;