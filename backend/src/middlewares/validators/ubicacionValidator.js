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

const validarRegistrarUbicacion = [
    param('idPedido')
        .trim()
        .notEmpty().withMessage('El ID del pedido es obligatorio')
        .isUUID(4).withMessage('El ID del pedido no es válido'),

    body('idDomiciliario')
        .trim()
        .notEmpty().withMessage('El domiciliario es obligatorio')
        .isUUID(4).withMessage('El ID del domiciliario no es válido'),

    body('latitud')
        .notEmpty().withMessage('La latitud es obligatoria')
        .isFloat({ min: -90, max: 90 }).withMessage('Latitud no válida'),

    body('longitud')
        .notEmpty().withMessage('La longitud es obligatoria')
        .isFloat({ min: -180, max: 180 }).withMessage('Longitud no válida'),

    body('velocidad')
        .optional()
        .isFloat({ min: 0 }).withMessage('La velocidad no puede ser negativa'),

    verificarValidacion
];

const validarIdPedidoUbicacion = [
    param('idPedido')
        .trim()
        .notEmpty().withMessage('El ID del pedido es obligatorio')
        .isUUID(4).withMessage('El ID del pedido no es válido'),

    verificarValidacion
];

module.exports = {
    validarRegistrarUbicacion,
    validarIdPedidoUbicacion
};