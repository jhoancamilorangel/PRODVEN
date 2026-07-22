import api from './api';

const authClienteService = {
    registrar: (datos) =>
        api.post('/auth/register', datos),

    verificarCorreo: (correo, codigo) =>
        api.post('/auth/verify-email', { correo, codigo }),

    // Login único para toda la app (cliente, vendedor, administrador,
    // superadmin). Ya NO se manda origen: 'marketplace' — ese parámetro
    // hacía que el backend rechazara con 403 a cualquier rol interno que
    // intentara entrar por aquí. Ahora este mismo formulario sirve para
    // todos; AuthCliente.jsx decide a dónde navegar según el rol real
    // que devuelva el backend.
    login: (correo, password) =>
        api.post('/auth/login', { correo, password }),

    verificar2FA: (idUsuario, codigo) =>
        api.post('/auth/2fa/verify', { idUsuario, codigo }),

    solicitarRecuperacion: (correo) =>
        api.post('/auth/forgot-password', { correo }),

    resetPassword: (correo, codigo, passwordNueva) =>
        api.post('/auth/reset-password', { correo, codigo, passwordNueva }),

    obtenerPerfil: () =>
        api.get('/auth/perfil'),

    actualizarPerfil: (datos) =>
        api.put('/auth/perfil', datos),

    cambiarPassword: (passwordActual, passwordNueva) =>
        api.put('/auth/cambiar-password', { passwordActual, passwordNueva }),

    logout: (refreshToken) =>
        api.post('/auth/logout', { refreshToken })
};

export default authClienteService;