import api from './api';

/**
 * Servicio de mensajería. Usa la instancia central api (services/api.js)
 * en vez de crear su propio axios — así hereda automáticamente la
 * selección correcta de token según zona (cliente vs personal interno)
 * y la renovación automática de sesión.
 */

const RUTA_BASE = '/conversaciones';

const extraerMensajeBackend = (data) => {
    if (!data) return null;
    if (typeof data.message === 'string' && data.message.trim() !== '') {
        return data.message;
    }
    return null;
};

const manejarError = (error) => {
    if (error?.response) {
        const status = error.response.status;
        const mensajeBackend = extraerMensajeBackend(error.response.data);

        if (status === 401 || status === 403) {
            throw new Error(mensajeBackend || 'Tu sesión expiró. Inicia sesión nuevamente.');
        }
        if (status >= 500) {
            throw new Error(mensajeBackend || 'Estamos teniendo problemas en el servidor. Intenta más tarde.');
        }
        throw new Error(mensajeBackend || 'Error en la petición al servidor.');
    }

    if (error?.code === 'ECONNABORTED') {
        throw new Error('La conexión tardó demasiado. Intenta nuevamente.');
    }

    if (error?.request) {
        throw new Error('No se pudo conectar con el servidor. Revisa tu conexión.');
    }

    throw new Error(error?.message || 'Ocurrió un error inesperado.');
};

const mensajeriaService = {
    crearConversacion: async (datos) => {
        try {
            if (datos.tipo !== 'soporte' && !datos.idEmpresa) {
                throw new Error('El ID de la empresa es obligatorio para crear este chat.');
            }
            const response = await api.post(RUTA_BASE, datos);
            return response.data;
        } catch (error) {
            return manejarError(error);
        }
    },

    listarConversaciones: async (idEmpresa = null, tipo = null) => {
        try {
            const params = {};
            if (idEmpresa) params.idEmpresa = idEmpresa;
            if (tipo) params.tipo = tipo;
            const response = await api.get(RUTA_BASE, { params });
            return response.data;
        } catch (error) {
            return manejarError(error);
        }
    },

    obtenerConversacion: async (idConversacion, idEmpresa = null) => {
        try {
            if (!idConversacion) throw new Error('El ID de la conversación es obligatorio.');
            const params = idEmpresa ? { idEmpresa } : {};
            const response = await api.get(`${RUTA_BASE}/${idConversacion}`, { params });
            return response.data;
        } catch (error) {
            return manejarError(error);
        }
    },

    enviarMensaje: async (idConversacion, datosMensaje) => {
        try {
            if (!idConversacion) throw new Error('El ID de la conversación es obligatorio.');
            if (!datosMensaje.contenido || datosMensaje.contenido.trim() === '') {
                throw new Error('No puedes enviar un mensaje vacío.');
            }
            const response = await api.post(`${RUTA_BASE}/${idConversacion}/mensajes`, datosMensaje);
            return response.data;
        } catch (error) {
            return manejarError(error);
        }
    },

    listarMensajes: async (idConversacion, pagina = 1, limit = 50) => {
        try {
            if (!idConversacion) throw new Error('El ID de la conversación es obligatorio.');
            const response = await api.get(`${RUTA_BASE}/${idConversacion}/mensajes`, {
                params: { pagina, limit }
            });
            return response.data;
        } catch (error) {
            return manejarError(error);
        }
    },

    marcarLeidos: async (idConversacion) => {
        try {
            if (!idConversacion) throw new Error('El ID de la conversación es obligatorio.');
            const response = await api.patch(`${RUTA_BASE}/${idConversacion}/leer`, {});
            // Avisa a la campana de notificaciones que puede haber cambios
            // (limpieza de notificaciones de esta conversación) sin
            // esperar a su próximo ciclo de polling de 60s.
            window.dispatchEvent(new CustomEvent('notificaciones-actualizadas'));
            return response.data;
        } catch (error) {
            return manejarError(error);
        }
    }
};

export default mensajeriaService;