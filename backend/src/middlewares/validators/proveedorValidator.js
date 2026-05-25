const { body, param, validationResult } = require('express-validator');
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

const validarCrearProveedor = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

    body('razonSocial')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('La razón social no puede superar 200 caracteres'),

    body('nit')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 }).withMessage('El NIT no puede superar 50 caracteres'),

    body('tipoDocumento')
        .optional()
        .isIn(['NIT', 'RUT', 'CIF', 'RFC', 'CUIT', 'CC', 'OTRO'])
        .withMessage('El tipo de documento no es válido'),

    body('nombreContacto')
        .optional()
        .trim()
        .isLength({ max: 150 }).withMessage('El nombre de contacto no puede superar 150 caracteres'),

    body('correo')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail(),

    body('telefono')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono solo puede contener números y símbolos válidos'),

    body('condicionPago')
        .optional()
        .isIn(['contado', 'credito_15', 'credito_30', 'credito_60', 'credito_90', 'otro'])
        .withMessage('La condición de pago no es válida'),

    body('diasCredito')
        .optional()
        .isInt({ min: 0, max: 365 }).withMessage('Los días de crédito deben estar entre 0 y 365'),

    body('tiempoEntregaDias')
        .optional()
        .isInt({ min: 0 }).withMessage('El tiempo de entrega debe ser un número positivo'),

    body('pedidoMinimo')
        .optional()
        .isFloat({ min: 0 }).withMessage('El pedido mínimo no puede ser negativo'),

    body('datosBancarios')
        .optional()
        .isObject().withMessage('Los datos bancarios deben ser un objeto'),

    verificarValidacion
];

const validarActualizarProveedor = [
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

    body('correo')
        .optional({ checkFalsy: true })
        .trim()
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail(),

    body('telefono')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono solo puede contener números y símbolos válidos'),

    body('condicionPago')
        .optional()
        .isIn(['contado', 'credito_15', 'credito_30', 'credito_60', 'credito_90', 'otro'])
        .withMessage('La condición de pago no es válida'),

    body('diasCredito')
        .optional()
        .isInt({ min: 0, max: 365 }).withMessage('Los días de crédito deben estar entre 0 y 365'),

    body('pedidoMinimo')
        .optional()
        .isFloat({ min: 0 }).withMessage('El pedido mínimo no puede ser negativo'),

    body('datosBancarios')
        .optional()
        .isObject().withMessage('Los datos bancarios deben ser un objeto'),

    verificarValidacion
];

const validarIdProveedor = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID es obligatorio')
        .isUUID(4).withMessage('El ID de proveedor no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearProveedor,
    validarActualizarProveedor,
    validarIdProveedor
};