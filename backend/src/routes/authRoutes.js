const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');

const authController = require('../controllers/authController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarRegistro,
    validarLogin,
    validarVerificacionCorreo,
    validarCodigo2FA,
    validarRefreshToken,
    validarSolicitudRecuperacion,
    validarResetPassword
} = require('../middlewares/validators/authValidator');

/**
 * Rate limiter específico para login
 * Protege contra ataques de fuerza bruta
 */
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        message: 'Demasiados intentos de inicio de sesión. Intenta nuevamente en 15 minutos.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter específico para registro
 * Evita que alguien cree miles de cuentas masivamente
 */
const registroLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        message: 'Demasiados intentos de registro desde esta IP. Intenta nuevamente en 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

/**
 * Rate limiter para recuperación de contraseña
 * Evita spam de correos de recuperación
 */
const recuperacionLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 3,
    message: {
        success: false,
        message: 'Demasiadas solicitudes de recuperación. Intenta nuevamente en 1 hora.'
    },
    standardHeaders: true,
    legacyHeaders: false
});

// =====================================================
// RUTAS PÚBLICAS (no requieren autenticación)
// =====================================================

/**
 * POST /api/auth/register
 * Registra un nuevo usuario y envía código de verificación
 */
router.post(
    '/register',
    registroLimiter,
    validarRegistro,
    authController.registrar
);

/**
 * POST /api/auth/verify-email
 * Verifica el correo del usuario con código de 6 dígitos
 */
router.post(
    '/verify-email',
    validarVerificacionCorreo,
    authController.verificarCorreo
);

/**
 * POST /api/auth/login
 * Inicia sesión con correo y contraseña
 */
router.post(
    '/login',
    loginLimiter,
    validarLogin,
    authController.login
);

/**
 * POST /api/auth/2fa/verify
 * Valida el código 2FA y completa el login
 */
router.post(
    '/2fa/verify',
    validarCodigo2FA,
    authController.verificar2FA
);

/**
 * POST /api/auth/refresh
 * Genera un nuevo access token usando el refresh token
 */
router.post(
    '/refresh',
    validarRefreshToken,
    authController.refrescarToken
);

/**
 * POST /api/auth/forgot-password
 * Envía un código de recuperación al correo
 */
router.post(
    '/forgot-password',
    recuperacionLimiter,
    validarSolicitudRecuperacion,
    authController.solicitarRecuperacion
);

/**
 * POST /api/auth/reset-password
 * Restablece la contraseña con el código recibido
 */
router.post(
    '/reset-password',
    validarResetPassword,
    authController.restablecerPassword
);

// =====================================================
// RUTAS PROTEGIDAS (requieren token válido)
// =====================================================

/**
 * POST /api/auth/logout
 * Cierra sesión en el dispositivo actual
 */
router.post(
    '/logout',
    verificarAutenticacion,
    authController.logout
);

/**
 * POST /api/auth/logout-all
 * Cierra sesión en todos los dispositivos del usuario
 */
router.post(
    '/logout-all',
    verificarAutenticacion,
    authController.logoutTodos
);

/**
 * GET /api/auth/me
 * Devuelve los datos del usuario autenticado actualmente incluyendo permisos
 * Útil para que el frontend sepa qué mostrar y qué ocultar
 */
router.get(
    '/me',
    verificarAutenticacion,
    (req, res) => {
        const { sendResponse } = require('../utils/response');
        return sendResponse(res, 200, true, 'Datos del usuario obtenidos', {
            idUsuario: req.usuario.idUsuario,
            idEmpresa: req.usuario.idEmpresa,
            nombres: req.usuario.nombres,
            apellidos: req.usuario.apellidos,
            correo: req.usuario.correo,
            telefono: req.usuario.telefono,
            avatarUrl: req.usuario.avatarUrl,
            rol: req.usuario.rol,
            verificado: req.usuario.verificado,
            twoFactorActivo: req.usuario.twoFactorActivo,
            ultimoAcceso: req.usuario.ultimoAcceso,
            permisos: req.permisos,
            esSuperAdmin: req.esSuperAdmin,
            esCliente: req.esCliente
        });
    }
);
module.exports = router;