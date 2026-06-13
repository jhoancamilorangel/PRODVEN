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

const validarAgregarProducto = [
    body('idProducto')
        .trim()
        .notEmpty().withMessage('El producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    body('cantidad')
        .optional()
        .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero mayor a cero'),

    body('idEmpresa')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de empresa no es válido'),

    body('notas')
        .optional()
        .trim()
        .isLength({ max: 500 }).withMessage('Las notas no pueden superar 500 caracteres'),

    verificarValidacion
];

const validarActualizarCantidad = [
    param('idItem')
        .trim()
        .notEmpty().withMessage('El ID del item es obligatorio')
        .isUUID(4).withMessage('El ID del item no es válido'),

    body('cantidad')
        .notEmpty().withMessage('La cantidad es obligatoria')
        .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero mayor a cero'),

    verificarValidacion
];

const validarIdItem = [
    param('idItem')
        .trim()
        .notEmpty().withMessage('El ID del item es obligatorio')
        .isUUID(4).withMessage('El ID del item no es válido'),

    verificarValidacion
];

module.exports = {
    validarAgregarProducto,
    validarActualizarCantidad,
    validarIdItem
};