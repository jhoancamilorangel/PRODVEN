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

const validarCrearPromocion = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ max: 150 }).withMessage('El nombre no puede superar 150 caracteres'),

    body('tipo')
        .notEmpty().withMessage('El tipo es obligatorio')
        .isIn(['porcentaje', 'valor_fijo', '2x1', 'envio_gratis']).withMessage('Tipo de promoción no válido'),

    body('valor')
        .notEmpty().withMessage('El valor es obligatorio')
        .isFloat({ min: 0 }).withMessage('El valor no puede ser negativo'),

    body('codigo')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 }).withMessage('El código no puede superar 50 caracteres'),

    body('usoMaximo')
        .optional({ nullable: true })
        .isInt({ min: 1 }).withMessage('El uso máximo debe ser al menos 1'),

    body('fechaInicio')
        .notEmpty().withMessage('La fecha de inicio es obligatoria')
        .isISO8601().withMessage('La fecha de inicio no es válida'),

    body('fechaFin')
        .notEmpty().withMessage('La fecha de fin es obligatoria')
        .isISO8601().withMessage('La fecha de fin no es válida'),

    verificarValidacion
];

const validarValidarPromocion = [
    body('codigo')
        .trim()
        .notEmpty().withMessage('El código es obligatorio'),

    body('monto')
        .notEmpty().withMessage('El monto es obligatorio')
        .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a cero'),

    verificarValidacion
];

const validarIdPromocion = [
    param('idPromocion')
        .trim()
        .notEmpty().withMessage('El ID de la promoción es obligatorio')
        .isUUID(4).withMessage('El ID de la promoción no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearPromocion,
    validarValidarPromocion,
    validarIdPromocion
};