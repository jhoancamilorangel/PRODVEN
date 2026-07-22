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

const validarCrearConversacion = [
    body('idEmpresa')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de empresa no es válido'),

    body('tipo')
        .optional()
        .isIn(['interna', 'cliente', `soporte`]).withMessage('Tipo de conversación no válido'),

    body('asunto')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('El asunto no puede superar 255 caracteres'),

    body('participantes')
        .optional()
        .isArray().withMessage('Los participantes deben ser una lista'),

    verificarValidacion
];

const validarEnviarMensaje = [
    param('idConversacion')
        .trim()
        .notEmpty().withMessage('El ID de la conversación es obligatorio')
        .isUUID(4).withMessage('El ID de la conversación no es válido'),

    body('contenido')
        .trim()
        .notEmpty().withMessage('El mensaje no puede estar vacío')
        .isLength({ max: 5000 }).withMessage('El mensaje es demasiado largo'),

    body('tipoContenido')
        .optional()
        .isIn(['texto', 'imagen', 'archivo', 'audio', 'video']).withMessage('Tipo de contenido no válido'),

    verificarValidacion
];

const validarIdConversacion = [
    param('idConversacion')
        .trim()
        .notEmpty().withMessage('El ID de la conversación es obligatorio')
        .isUUID(4).withMessage('El ID de la conversación no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearConversacion,
    validarEnviarMensaje,
    validarIdConversacion
};