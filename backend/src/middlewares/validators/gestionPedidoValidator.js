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

const validarCambioEstado = [
    param('idPedido')
        .trim()
        .notEmpty().withMessage('El ID del pedido es obligatorio')
        .isUUID(4).withMessage('El ID del pedido no es válido'),

    body('nuevoEstado')
        .trim()
        .notEmpty().withMessage('El nuevo estado es obligatorio')
        .isIn(['confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado', 'reembolsado'])
        .withMessage('Estado no válido'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('La descripción no puede superar 500 caracteres'),

    verificarValidacion
];

const validarCancelar = [
    param('idPedido')
        .trim()
        .notEmpty().withMessage('El ID del pedido es obligatorio')
        .isUUID(4).withMessage('El ID del pedido no es válido'),

    body('motivo')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('El motivo no puede superar 500 caracteres'),

    verificarValidacion
];

module.exports = {
    validarCambioEstado,
    validarCancelar
};