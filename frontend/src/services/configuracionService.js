import api from './api';

/**
 * Servicio de Configuración de la empresa.
 */
const configuracionService = {
    obtener: () =>
        api.get('/configuracion'),

    actualizar: (datos) =>
        api.put('/configuracion', datos),

    actualizarColores: (datos) =>
        api.patch('/configuracion/colores', datos),

    actualizarMetodosPago: (datos) =>
        api.patch('/configuracion/metodos-pago', datos),

    toggleMantenimiento: (activar, mensaje) =>
        api.patch('/configuracion/mantenimiento', { activar, mensaje })
};

export default configuracionService;