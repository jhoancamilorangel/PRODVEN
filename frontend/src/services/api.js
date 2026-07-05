import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    headers: { 'Content-Type': 'application/json' }
});

const RUTAS_CLIENTE = ['/marketplace', '/tienda', '/producto', '/carrito', '/checkout', '/cuenta', '/mis-compras', '/mi-perfil', '/mis-pedidos', '/vender'];

const esZonaCliente = () =>
    RUTAS_CLIENTE.some((b) => window.location.pathname === b || window.location.pathname.startsWith(b + '/'));

// Llaves de la zona actual
const llaves = () => esZonaCliente()
    ? { token: 'prodven_cli_token', refresh: 'prodven_cli_refresh', usuario: 'prodven_cli_usuario', login: '/cuenta' }
    : { token: 'prodven_token', refresh: 'prodven_refresh', usuario: 'prodven_usuario', login: '/login' };

const cerrarSesion = (l) => {
    localStorage.removeItem(l.token);
    localStorage.removeItem(l.refresh);
    localStorage.removeItem(l.usuario);
    if (window.location.pathname !== l.login) window.location.href = l.login;
};

// --- Interceptor de petición: adjunta el token de la zona ---
api.interceptors.request.use((config) => {
    const token = localStorage.getItem(llaves().token);
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// --- Refresh automático en 401 ---
let refrescando = false;
let colaEspera = [];

const resolverCola = (nuevoToken) => {
    colaEspera.forEach((cb) => cb(nuevoToken));
    colaEspera = [];
};

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config;
        const es401 = error.response?.status === 401;
        const esAuth = original?.url?.includes('/auth/login') || original?.url?.includes('/auth/refresh');

        // Si no es 401, o ya se reintentó, o es login/refresh → no insistir
        if (!es401 || original._reintento || esAuth) {
            return Promise.reject(error);
        }

        const l = llaves();
        const refreshToken = localStorage.getItem(l.refresh);

        // Sin refresh token → cerrar sesión
        if (!refreshToken) {
            cerrarSesion(l);
            return Promise.reject(error);
        }

        original._reintento = true;

        // Si ya hay un refresh en curso, esperar el token nuevo y reintentar
        if (refrescando) {
            return new Promise((resolve) => {
                colaEspera.push((nuevoToken) => {
                    if (nuevoToken) {
                        original.headers.Authorization = `Bearer ${nuevoToken}`;
                        resolve(api(original));
                    } else {
                        resolve(Promise.reject(error));
                    }
                });
            });
        }

        // Iniciar el refresh
        refrescando = true;
        try {
            const resp = await axios.post(
                `${import.meta.env.VITE_API_URL}/auth/refresh`,
                { refreshToken },
                { headers: { 'Content-Type': 'application/json' } }
            );
            const nuevoToken = resp.data?.data?.accessToken;
            if (!nuevoToken) throw new Error('Sin accessToken');

            localStorage.setItem(l.token, nuevoToken);
            refrescando = false;
            resolverCola(nuevoToken);

            original.headers.Authorization = `Bearer ${nuevoToken}`;
            return api(original);
        } catch (err) {
            refrescando = false;
            resolverCola(null);
            cerrarSesion(l);
            return Promise.reject(err);
        }
    }
);

export default api;