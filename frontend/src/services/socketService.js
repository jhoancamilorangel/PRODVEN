import { io } from 'socket.io-client';

const obtenerTokenActual = () => {
    // Buscamos cuál de los dos tokens existe físicamente en esta pestaña
    const tokenCliente = sessionStorage.getItem('prodven_cli_token');
    const tokenAdmin = sessionStorage.getItem('prodven_token');
    
    // Si hay token de cliente, usamos ese; si no, el de administración
    return tokenCliente || tokenAdmin || null;
};
let socket = null;

/**
 * Devuelve la conexión de Socket.io activa. Es un singleton: toda la
 * app comparte la misma conexión WebSocket. Si el token cambió (ej.
 * tras iniciar sesión) o no hay conexión, crea una nueva.
 * Devuelve null si no hay token (usuario no autenticado en esta zona).
 */
const obtenerSocket = () => {
    const token = obtenerTokenActual();
    if (!token) return null;

    if (socket && socket.auth?.token === token && socket.connected) {
        return socket;
    }

    if (socket) {
        socket.disconnect();
    }

    const baseApi = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
    const baseUrl = baseApi.replace(/\/api\/?$/, '');

    socket = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000
    });

    return socket;
};

/**
 * Cierra la conexión activa (llamar al hacer logout).
 */
const cerrarSocket = () => {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
};

export default { obtenerSocket, cerrarSocket };