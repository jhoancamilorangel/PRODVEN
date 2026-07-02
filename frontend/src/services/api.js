import axios from 'axios';

/**
 * Cliente HTTP central de ProdVen.
 *
 * El sistema maneja DOS sesiones independientes que no se pisan:
 *  - Panel admin/dueño: llaves prodven_token / prodven_usuario / prodven_refresh
 *  - Cliente marketplace: llaves prodven_cli_token / prodven_cli_usuario / prodven_cli_refresh
 *
 * Según la ruta en la que esté el usuario, se usa el token correspondiente.
 */

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Rutas que pertenecen a la zona del cliente (marketplace)
const RUTAS_CLIENTE = ['/marketplace', '/tienda', '/producto', '/carrito', '/checkout', '/cuenta', '/mis-compras', '/mis-pedidos'];

/**
 * Determina si la ruta actual del navegador es zona de cliente
 */
const esZonaCliente = () => {
    const ruta = window.location.pathname;
    return RUTAS_CLIENTE.some((base) => ruta === base || ruta.startsWith(base + '/'));
};

/**
 * Devuelve el token correcto según la zona actual
 */
const obtenerToken = () => {
    if (esZonaCliente()) {
        return localStorage.getItem('prodven_cli_token');
    }
    return localStorage.getItem('prodven_token');
};

/**
 * INTERCEPTOR DE PETICIONES
 * Adjunta el token correcto (cliente o admin) según la zona.
 */
api.interceptors.request.use(
    (config) => {
        const token = obtenerToken();
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
 * Si el backend responde 401, limpia SOLO la sesión de la zona actual
 * y redirige al login correspondiente (cliente o admin).
 */
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            if (esZonaCliente()) {
                // Sesión de cliente vencida
                localStorage.removeItem('prodven_cli_token');
                localStorage.removeItem('prodven_cli_refresh');
                localStorage.removeItem('prodven_cli_usuario');
                if (window.location.pathname !== '/cuenta') {
                    window.location.href = '/cuenta';
                }
            } else {
                // Sesión de admin vencida
                localStorage.removeItem('prodven_token');
                localStorage.removeItem('prodven_refresh');
                localStorage.removeItem('prodven_usuario');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }
        return Promise.reject(error);
    }
);

export default api;