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

const validarCrearResena = [
    body('idProducto')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID del producto no es válido'),

    body('calificacion')
        .notEmpty().withMessage('La calificación es obligatoria')
        .isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser un número de 1 a 5'),

    body('titulo')
        .optional()
        .trim()
        .isLength({ max: 150 }).withMessage('El título no puede superar 150 caracteres'),

    body('comentario')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('El comentario es demasiado largo'),

    verificarValidacion
];

const validarEditarResena = [
    param('idResena')
        .trim()
        .notEmpty().withMessage('El ID de la reseña es obligatorio')
        .isUUID(4).withMessage('El ID de la reseña no es válido'),

    body('calificacion')
        .optional()
        .isInt({ min: 1, max: 5 }).withMessage('La calificación debe ser un número de 1 a 5'),

    body('titulo')
        .optional()
        .trim()
        .isLength({ max: 150 }).withMessage('El título no puede superar 150 caracteres'),

    body('comentario')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('El comentario es demasiado largo'),

    verificarValidacion
];

const validarIdResena = [
    param('idResena')
        .trim()
        .notEmpty().withMessage('El ID de la reseña es obligatorio')
        .isUUID(4).withMessage('El ID de la reseña no es válido'),

    verificarValidacion
];

const validarIdProducto = [
    param('idProducto')
        .trim()
        .notEmpty().withMessage('El ID del producto es obligatorio')
        .isUUID(4).withMessage('El ID del producto no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearResena,
    validarEditarResena,
    validarIdResena,
    validarIdProducto
};