/**
 * Lee la sesión del cliente del marketplace desde localStorage.
 *
 * El cliente NO usa AuthContext (ese es exclusivo del panel interno,
 * solo lee 'prodven_usuario'/'prodven_token'). AuthCliente.jsx guarda
 * la sesión del cliente en claves separadas ('prodven_cli_*'), así
 * que cualquier pantalla del lado cliente (VistaChatCliente, etc.)
 * debe leer de aquí, nunca de useAuth().
 */
export const obtenerUsuarioCliente = () => {
    try {
        const guardado = sessionStorage.getItem('prodven_cli_usuario');
        return guardado ? JSON.parse(guardado) : null;
    } catch {
        return null;
    }
};