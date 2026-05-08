const { body, validationResult } = require('express-validator');
const { sendResponse } = require('../../utils/response');

/**
 * Middleware que verifica si hubo errores de validación
 * y devuelve respuesta estandarizada en caso de fallo
 */
const verificarValidacion = (req, res, next) => {
    const errores = validationResult(req);
    if (!errores.isEmpty()) {
        const listaErrores = errores.array().map(err => ({
            campo: err.path,
            mensaje: err.msg
        }));
        return sendResponse(res, 400, false, 'Datos inválidos', null, listaErrores);
    }
    next();
};

/**
 * Validador para el registro de un nuevo usuario
 */
const validarRegistro = [
    body('nombres')
        .trim()
        .notEmpty().withMessage('Los nombres son obligatorios')
        .isLength({ min: 2, max: 100 }).withMessage('Los nombres deben tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Los nombres solo pueden contener letras y espacios'),

    body('apellidos')
        .trim()
        .notEmpty().withMessage('Los apellidos son obligatorios')
        .isLength({ min: 2, max: 100 }).withMessage('Los apellidos deben tener entre 2 y 100 caracteres')
        .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/).withMessage('Los apellidos solo pueden contener letras y espacios'),

    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail()
        .isLength({ max: 150 }).withMessage('El correo no puede superar 150 caracteres'),

    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una letra mayúscula')
        .matches(/[a-z]/).withMessage('La contraseña debe tener al menos una letra minúscula')
        .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('La contraseña debe tener al menos un carácter especial'),

    body('telefono')
        .optional()
        .trim()
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono debe tener entre 7 y 20 caracteres')
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono solo puede contener números y símbolos válidos'),

    body('rol')
        .optional()
        .isIn(['administrador', 'vendedor', 'produccion', 'supervisor', 'cliente'])
        .withMessage('El rol no es válido'),

    verificarValidacion
];

/**
 * Validador para el inicio de sesión
 */
const validarLogin = [
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria'),

    verificarValidacion
];

/**
 * Validador para verificación de correo
 */
const validarVerificacionCorreo = [
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail(),

    body('codigo')
        .trim()
        .notEmpty().withMessage('El código es obligatorio')
        .isLength({ min: 6, max: 6 }).withMessage('El código debe tener exactamente 6 dígitos')
        .isNumeric().withMessage('El código solo puede contener números'),

    verificarValidacion
];

/**
 * Validador para verificación de código 2FA
 */
const validarCodigo2FA = [
    body('idUsuario')
        .trim()
        .notEmpty().withMessage('El ID de usuario es obligatorio')
        .isUUID(4).withMessage('El ID de usuario no es válido'),

    body('codigo')
        .trim()
        .notEmpty().withMessage('El código es obligatorio')
        .isLength({ min: 6, max: 6 }).withMessage('El código debe tener exactamente 6 dígitos')
        .isNumeric().withMessage('El código solo puede contener números'),

    verificarValidacion
];

/**
 * Validador para renovación de token
 */
const validarRefreshToken = [
    body('refreshToken')
        .trim()
        .notEmpty().withMessage('El refresh token es obligatorio'),

    verificarValidacion
];

/**
 * Validador para solicitar recuperación de contraseña
 */
const validarSolicitudRecuperacion = [
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail(),

    verificarValidacion
];

/**
 * Validador para restablecer contraseña
 */
const validarResetPassword = [
    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail(),

    body('codigo')
        .trim()
        .notEmpty().withMessage('El código es obligatorio')
        .isLength({ min: 6, max: 6 }).withMessage('El código debe tener exactamente 6 dígitos')
        .isNumeric().withMessage('El código solo puede contener números'),

    body('passwordNueva')
        .notEmpty().withMessage('La nueva contraseña es obligatoria')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres')
        .matches(/[A-Z]/).withMessage('La contraseña debe tener al menos una letra mayúscula')
        .matches(/[a-z]/).withMessage('La contraseña debe tener al menos una letra minúscula')
        .matches(/[0-9]/).withMessage('La contraseña debe tener al menos un número')
        .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('La contraseña debe tener al menos un carácter especial'),

    verificarValidacion
];

module.exports = {
    validarRegistro,
    validarLogin,
    validarVerificacionCorreo,
    validarCodigo2FA,
    validarRefreshToken,
    validarSolicitudRecuperacion,
    validarResetPassword
};