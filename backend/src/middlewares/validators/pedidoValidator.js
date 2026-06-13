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

const validarCrearPedido = [
    body('idEmpresa')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de empresa no es válido'),

    body('tipoEntrega')
        .optional()
        .isIn(['domicilio', 'recogida', 'en_sitio'])
        .withMessage('Tipo de entrega no válido'),

    body('tipoPago')
        .optional()
        .isIn(['digital', 'contra_entrega', 'mixto'])
        .withMessage('Tipo de pago no válido'),

    body('costoDomicilio')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo de domicilio no puede ser negativo'),

    body('impuestos')
        .optional()
        .isFloat({ min: 0 }).withMessage('Los impuestos no pueden ser negativos'),

    body('notas')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Las notas no pueden superar 1000 caracteres'),

    verificarValidacion
];

const validarIdPedido = [
    param('idPedido')
        .trim()
        .notEmpty().withMessage('El ID del pedido es obligatorio')
        .isUUID(4).withMessage('El ID del pedido no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearPedido,
    validarIdPedido
};