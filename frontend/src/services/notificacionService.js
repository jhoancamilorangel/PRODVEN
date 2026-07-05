import api from './api';

/**
 * Servicio de Notificaciones (frontend)
 *
 * Habla con los endpoints de notificaciones del backend. Sirve para
 * AMBAS zonas (marketplace y panel): api.js resuelve solo qué token
 * adjuntar según la ruta en la que esté el usuario, así que el mismo
 * service funciona para el cliente y para el negocio sin cambios.
 */
const notificacionService = {
    /**
     * Lista las notificaciones del usuario autenticado.
     * @param {object} params - { soloNoLeidas, pagina, limit } (opcionales)
     */
    listar: (params = {}) =>
        api.get('/notificaciones', { params }),

    /**
     * Devuelve el conteo de no leídas: { noLeidas: N }
     */
    contarNoLeidas: () =>
        api.get('/notificaciones/no-leidas'),

    /**
     * Marca una notificación específica como leída.
     */
    marcarLeida: (idNotificacion) =>
        api.patch(`/notificaciones/${idNotificacion}/leer`),

    /**
     * Marca todas las notificaciones del usuario como leídas.
     */
    marcarTodasLeidas: () =>
        api.patch('/notificaciones/leer-todas')
};

export default notificacionService;