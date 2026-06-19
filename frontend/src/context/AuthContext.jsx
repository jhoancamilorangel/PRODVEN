import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

/**
 * Contexto de Autenticación de ProdVen.
 *
 * Es el "cerebro" de la sesión: mantiene quién está logueado y
 * ofrece las funciones de login y logout a toda la aplicación.
 * Cualquier componente puede saber el usuario actual o cerrar sesión
 * sin tener que pasar datos manualmente de pantalla en pantalla.
 */

const AuthContext = createContext(null);

/**
 * Proveedor que envuelve la app y entrega el estado de autenticación.
 */
export function AuthProvider({ children }) {
    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    /**
     * Al arrancar la app, revisa si ya hay una sesión guardada
     * (el usuario ya se había logueado antes y no cerró sesión).
     */
    useEffect(() => {
        const usuarioGuardado = localStorage.getItem('prodven_usuario');
        if (usuarioGuardado) {
            try {
                setUsuario(JSON.parse(usuarioGuardado));
            } catch {
                localStorage.removeItem('prodven_usuario');
            }
        }
        setCargando(false);
    }, []);

    /**
     * Inicia sesión: llama al backend, guarda token y usuario.
     * @returns {object} { exito, mensaje }
     */
    const login = async (correo, contrasena) => {
        try {
            const respuesta = await api.post('/auth/login', { correo, password: contrasena });

            const { accessToken, refreshToken, usuario: datosUsuario } = respuesta.data.data;

            // Guardar los tokens y el usuario en el navegador
            localStorage.setItem('prodven_token', accessToken);
            localStorage.setItem('prodven_refresh', refreshToken);
            localStorage.setItem('prodven_usuario', JSON.stringify(datosUsuario));

            setUsuario(datosUsuario);

            return { exito: true };
        } catch (error) {
            const mensaje = error.response?.data?.message || 'Error al iniciar sesión. Verifica tus credenciales.';
            return { exito: false, mensaje };
        }
    };

    /**
     * Cierra sesión: limpia todo y borra al usuario.
     */
    const logout = () => {
        localStorage.removeItem('prodven_token');
        localStorage.removeItem('prodven_refresh');
        localStorage.removeItem('prodven_usuario');
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

/**
 * Hook para usar el contexto de autenticación fácilmente
 * desde cualquier componente: const { usuario, login, logout } = useAuth();
 */
export function useAuth() {
    const contexto = useContext(AuthContext);
    if (contexto === null) {
        throw new Error('useAuth debe usarse dentro de un AuthProvider');
    }
    return contexto;
}