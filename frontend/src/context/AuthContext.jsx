import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';
import socketService from '../services/socketService';

/**
 * Contexto de Autenticación de ProdVen.
 * Centraliza las llaves dinámicas idénticas a las de api.js
 */
const AuthContext = createContext(null);

const RUTAS_CLIENTE = [
    '/marketplace', '/tienda', '/producto', '/carrito', 
    '/checkout', '/cuenta', '/mis-compras', '/mi-perfil', 
    '/mis-pedidos', '/vender', '/soporte'
];

// Función espejo de api.js para saber qué llaves leer/escribir
const obtenerLlavesActuales = () => {
    const tieneTokenCliente = !!sessionStorage.getItem('prodven_cli_token');
    return tieneTokenCliente
        ? { token: 'prodven_cli_token', refresh: 'prodven_cli_refresh', usuario: 'prodven_cli_usuario' }
        : { token: 'prodven_token', refresh: 'prodven_refresh', usuario: 'prodven_usuario' };
};

export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    /**
     * Revisa la sesión al arrancar usando las llaves dinámicas correctas
     */
    useEffect(() => {
        const l = obtenerLlavesActuales();
        const usuarioGuardado = sessionStorage.getItem(l.usuario);
        
        if (usuarioGuardado) {
            try {
                setUsuario(JSON.parse(usuarioGuardado));
            } catch {
                sessionStorage.removeItem(l.usuario);
            }
        }
        setCargando(false);
    }, []);

    /**
     * Inicia sesión guardando en las llaves dinámicas según la zona
     */
    const login = async (correo, contrasena) => {
        try {
            const respuesta = await api.post('/auth/login', { correo, password: contrasena });
            const { accessToken, refreshToken, usuario: datosUsuario } = respuesta.data.data;

            const l = obtenerLlavesActuales();
            sessionStorage.setItem(l.token, accessToken);
            sessionStorage.setItem(l.refresh, refreshToken);
            sessionStorage.setItem(l.usuario, JSON.stringify(datosUsuario));

            setUsuario(datosUsuario);
            return { exito: true };
        } catch (error) {
            const mensaje = error.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
            return { exito: false, mensaje };
        }
    };

    /**
     * Cierra sesión limpiando las llaves dinámicas de la zona actual
     */
    const logout = async () => {
        const l = obtenerLlavesActuales();
        const refreshToken = sessionStorage.getItem(l.refresh);

        try {
            await api.post('/auth/logout', { refreshToken });
        } catch (error) {
            console.error('Error al cerrar sesión en el servidor:', error);
        }

        sessionStorage.removeItem(l.token);
        sessionStorage.removeItem(l.refresh);
        sessionStorage.removeItem(l.usuario);
        socketService.cerrarSocket();
        setUsuario(null);
    };

    const valor = {
        usuario,
        cargando,
        estaAutenticado: !!usuario,
        login,
        logout
    };

    return (
        <AuthContext.Provider value={valor}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const contexto = useContext(AuthContext);
    if (contexto === null) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return contexto;
}