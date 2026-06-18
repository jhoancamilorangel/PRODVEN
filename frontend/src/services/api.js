import axios from 'axios';

/**
 * Cliente HTTP central de ProdVen.
 *
 * Configura Axios una sola vez con la URL base del backend.
 * Todas las peticiones a la API pasan por aquí, lo que permite:
 *  - Tener la URL base en un solo lugar
 *  - Adjuntar automáticamente el token de autenticación
 *  - Manejar errores de forma centralizada (ej: sesión expirada)
 */

// Crear la instancia de Axios con la URL base desde las variables de entorno
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * INTERCEPTOR DE PETICIONES
 * Se ejecuta ANTES de cada petición que sale hacia el backend.
 * Si hay un token guardado (usuario logueado), lo adjunta
 * automáticamente en la cabecera Authorization.
 */
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('prodven_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

/**
 * INTERCEPTOR DE RESPUESTAS
 * Se ejecuta DESPUÉS de cada respuesta del backend.
 * Si el backend responde 401 (no autorizado / sesión expirada),
 * limpia la sesión y redirige al login.
 */
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            // Sesión expirada o token inválido
            localStorage.removeItem('prodven_token');
            localStorage.removeItem('prodven_usuario');
            // Redirigir al login (lo afinaremos cuando montemos el enrutamiento)
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;