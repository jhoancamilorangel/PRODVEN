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

const METODOS_VALIDOS = [
    'tarjeta_credito',
    'tarjeta_debito',
    'pse',
    'efectivo',
    'efecty',
    'baloto',
    'nequi',
    'daviplata',
    'transferencia'
];

const validarCrearPago = [
    body('tipoPago')
        .trim()
        .notEmpty().withMessage('El tipo de pago es obligatorio')
        .isIn(['pedido', 'suscripcion']).withMessage('El tipo de pago debe ser pedido o suscripcion'),

    body('monto')
        .notEmpty().withMessage('El monto es obligatorio')
        .isFloat({ gt: 0 }).withMessage('El monto debe ser mayor a cero'),

    body('moneda')
        .optional()
        .trim()
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser un código de 3 letras'),

    body('metodo')
        .trim()
        .notEmpty().withMessage('El método de pago es obligatorio')
        .isIn(METODOS_VALIDOS).withMessage(`El método debe ser uno de: ${METODOS_VALIDOS.join(', ')}`),

    body('idPedido')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de pedido no es válido'),

    body('idSuscripcion')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de suscripción no es válido'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La descripción no puede superar 255 caracteres'),

    verificarValidacion
];

const validarReembolso = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID del pago es obligatorio')
        .isUUID(4).withMessage('El ID del pago no es válido'),

    body('motivo')
        .trim()
        .notEmpty().withMessage('El motivo del reembolso es obligatorio')
        .isLength({ min: 5, max: 500 }).withMessage('El motivo debe tener entre 5 y 500 caracteres'),

    verificarValidacion
];

const validarIdPago = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID del pago es obligatorio')
        .isUUID(4).withMessage('El ID del pago no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearPago,
    validarReembolso,
    validarIdPago
};