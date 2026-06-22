import api from './api';

const authClienteService = {
    registrar: (datos) =>
        api.post('/auth/register', datos),

    verificarCorreo: (correo, codigo) =>
        api.post('/auth/verify-email', { correo, codigo }),

    login: (correo, password) =>
        api.post('/auth/login', { correo, password }),

    verificar2FA: (idUsuario, codigo) =>
        api.post('/auth/2fa/verify', { idUsuario, codigo }),

    solicitarRecuperacion: (correo) =>
        api.post('/auth/forgot-password', { correo }),

    resetPassword: (correo, codigo, passwordNueva) =>
        api.post('/auth/reset-password', { correo, codigo, passwordNueva })
};

export default authClienteService;