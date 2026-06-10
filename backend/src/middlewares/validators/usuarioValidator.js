const { body, param } = require('express-validator');
const { validationResult } = require('express-validator');
const { sendResponse } = require('../../utils/response');

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

const ROLES_VALIDOS = ['administrador', 'vendedor', 'produccion', 'supervisor', 'cliente', 'domiciliario'];

const validarCrearUsuario = [
    body('nombres')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),

    body('apellidos')
        .trim()
        .notEmpty().withMessage('El apellido es obligatorio')
        .isLength({ max: 100 }).withMessage('El apellido no puede superar 100 caracteres'),

    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('El correo no es válido')
        .normalizeEmail(),

    body('password')
        .notEmpty().withMessage('La contraseña es obligatoria')
        .isLength({ min: 8 }).withMessage('La contraseña debe tener al menos 8 caracteres'),

    body('rol')
        .trim()
        .notEmpty().withMessage('El rol es obligatorio')
        .isIn(ROLES_VALIDOS).withMessage(`El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}`),

    body('telefono')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 20 }).withMessage('El teléfono no puede superar 20 caracteres'),

    body('debeChangarPassword')
        .optional()
        .isBoolean().withMessage('debeChangarPassword debe ser verdadero o falso'),

    verificarValidacion
];

const validarActualizarUsuario = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID del usuario es obligatorio')
        .isUUID(4).withMessage('El ID del usuario no es válido'),

    body('nombres')
        .optional()
        .trim()
        .notEmpty().withMessage('El nombre no puede estar vacío')
        .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),

    body('apellidos')
        .optional()
        .trim()
        .notEmpty().withMessage('El apellido no puede estar vacío')
        .isLength({ max: 100 }).withMessage('El apellido no puede superar 100 caracteres'),

    body('correo')
        .optional()
        .trim()
        .isEmail().withMessage('El correo no es válido')
        .normalizeEmail(),

    body('telefono')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 20 }).withMessage('El teléfono no puede superar 20 caracteres'),

    body('rol')
        .optional()
        .trim()
        .isIn(ROLES_VALIDOS).withMessage(`El rol debe ser uno de: ${ROLES_VALIDOS.join(', ')}`),

    verificarValidacion
];

const validarIdUsuario = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID del usuario es obligatorio')
        .isUUID(4).withMessage('El ID del usuario no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearUsuario,
    validarActualizarUsuario,
    validarIdUsuario
};