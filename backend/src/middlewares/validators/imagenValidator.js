const { param, body, validationResult } = require('express-validator');
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

/**
 * Verifica que se haya subido un archivo de imagen
 * Multer coloca el archivo en req.file
 */
const verificarArchivoImagen = (req, res, next) => {
    if (!req.file) {
        return sendResponse(res, 400, false, 'No se proporcionó ninguna imagen');
    }

    const formatosPermitidos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!formatosPermitidos.includes(req.file.mimetype)) {
        return sendResponse(res, 400, false, 'Formato no permitido. Usa JPG, PNG o WEBP');
    }

    next();
};

const validarIdProductoParam = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    verificarValidacion
];

const validarIdImagenParam = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    param('imagenId')
        .trim()
        .notEmpty().withMessage('El ID de imagen es obligatorio')
        .isUUID(4).withMessage('El ID de imagen no es válido'),

    verificarValidacion
];

const validarOrdenImagenes = [
    body('orden')
        .isArray({ min: 1 }).withMessage('El orden debe ser un array con al menos un elemento')
        .custom((value) => {
            for (const item of value) {
                if (!item.idImagen || typeof item.ordenVisualizacion !== 'number') {
                    throw new Error('Cada elemento debe tener idImagen y ordenVisualizacion');
                }
            }
            return true;
        }),

    verificarValidacion
];

module.exports = {
    verificarArchivoImagen,
    validarIdProductoParam,
    validarIdImagenParam,
    validarOrdenImagenes
};