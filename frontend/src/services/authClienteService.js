import api from './api';

const authClienteService = {
    registrar: (datos) =>
        api.post('/auth/register', datos),

    verificarCorreo: (correo, codigo) =>
        api.post('/auth/verify-email', { correo, codigo }),

    // El origen 'marketplace' permite al backend bloquear el acceso de
    // cuentas internas (negocio) a la zona de cliente.
    login: (correo, password) =>
        api.post('/auth/login', { correo, password, origen: 'marketplace' }),

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