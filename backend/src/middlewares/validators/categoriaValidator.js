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

const validarCrearCategoria = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('La descripción no puede superar 1000 caracteres'),

    body('icono')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('El icono no puede superar 50 caracteres'),

    body('color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe estar en formato #RRGGBB'),

    body('idCategoriaPadre')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('La categoría padre no es válida'),

    body('ordenVisualizacion')
        .optional()
        .isInt({ min: 0 }).withMessage('El orden debe ser un número entero positivo'),

    body('visibleEnMarketplace')
        .optional()
        .isBoolean().withMessage('visibleEnMarketplace debe ser verdadero o falso'),

    verificarValidacion
];

const validarActualizarCategoria = [
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('La descripción no puede superar 1000 caracteres'),

    body('icono')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('El icono no puede superar 50 caracteres'),

    body('color')
        .optional()
        .matches(/^#[0-9A-Fa-f]{6}$/).withMessage('El color debe estar en formato #RRGGBB'),

    body('idCategoriaPadre')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('La categoría padre no es válida'),

    body('ordenVisualizacion')
        .optional()
        .isInt({ min: 0 }).withMessage('El orden debe ser un número entero positivo'),

    body('visibleEnMarketplace')
        .optional()
        .isBoolean().withMessage('visibleEnMarketplace debe ser verdadero o falso'),

    verificarValidacion
];

const validarIdCategoria = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID es obligatorio')
        .isUUID(4).withMessage('El ID de categoría no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearCategoria,
    validarActualizarCategoria,
    validarIdCategoria
};