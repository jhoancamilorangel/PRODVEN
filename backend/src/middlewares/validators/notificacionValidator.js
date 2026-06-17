const { param } = require('express-validator');
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

const validarIdNotificacion = [
    param('idNotificacion')
        .trim()
        .notEmpty().withMessage('El ID de la notificación es obligatorio')
        .isUUID().withMessage('El ID de la notificación no es válido'),

    verificarValidacion
];

module.exports = {
    validarIdNotificacion
};