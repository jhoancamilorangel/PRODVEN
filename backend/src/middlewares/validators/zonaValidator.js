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

const validarCrearZona = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre de la zona es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre no puede superar 100 caracteres'),

    body('tipo')
        .optional()
        .isIn(['circulo', 'poligono', 'ciudad', 'barrio']).withMessage('Tipo de zona no válido'),

    body('latitudCentro')
        .optional()
        .isFloat({ min: -90, max: 90 }).withMessage('Latitud no válida'),

    body('longitudCentro')
        .optional()
        .isFloat({ min: -180, max: 180 }).withMessage('Longitud no válida'),

    body('radioKm')
        .optional()
        .isFloat({ min: 0.1 }).withMessage('El radio debe ser mayor a cero'),

    body('costoAdicional')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo adicional no puede ser negativo'),

    body('tiempoEstimadoMin')
        .optional()
        .isInt({ min: 1 }).withMessage('El tiempo estimado debe ser al menos 1 minuto'),

    verificarValidacion
];

const validarIdZona = [
    param('idZona')
        .trim()
        .notEmpty().withMessage('El ID de la zona es obligatorio')
        .isUUID(4).withMessage('El ID de la zona no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearZona,
    validarIdZona
};