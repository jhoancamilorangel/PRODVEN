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

const validarCrearProducto = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

    body('codigoSku')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 }).withMessage('El SKU no puede superar 50 caracteres')
        .matches(/^[A-Za-z0-9\-_]+$/).withMessage('El SKU solo puede contener letras, números, guiones y guion bajo'),

    body('codigoBarras')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 }).withMessage('El código de barras no puede superar 50 caracteres'),

    body('descripcionCorta')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La descripción corta no puede superar 255 caracteres'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('La descripción no puede superar 5000 caracteres'),

    body('precioVenta')
        .notEmpty().withMessage('El precio de venta es obligatorio')
        .isFloat({ min: 0 }).withMessage('El precio de venta no puede ser negativo'),

    body('precioCosto')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de costo no puede ser negativo'),

    body('precioOferta')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('El precio de oferta no puede ser negativo'),

    body('idCategoria')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('La categoría no es válida'),

    body('idProveedor')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El proveedor no es válido'),

    body('cantidadStock')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock no puede ser negativo'),

    body('stockMinimo')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock mínimo no puede ser negativo'),

    body('unidadMedida')
        .optional()
        .isIn(['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'])
        .withMessage('La unidad de medida no es válida'),

    body('peso')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('El peso no puede ser negativo'),

    body('aplicaIva')
        .optional()
        .isBoolean().withMessage('aplicaIva debe ser verdadero o falso'),

    body('gestionaStock')
        .optional()
        .isBoolean().withMessage('gestionaStock debe ser verdadero o falso'),

    body('esFabricado')
        .optional()
        .isBoolean().withMessage('esFabricado debe ser verdadero o falso'),

    verificarValidacion
];

const validarActualizarProducto = [
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

    body('precioVenta')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de venta no puede ser negativo'),

    body('precioCosto')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de costo no puede ser negativo'),

    body('precioOferta')
        .optional({ checkFalsy: true })
        .isFloat({ min: 0 }).withMessage('El precio de oferta no puede ser negativo'),

    body('idCategoria')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('La categoría no es válida'),

    body('idProveedor')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El proveedor no es válido'),

    body('cantidadStock')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock no puede ser negativo'),

    body('stockMinimo')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock mínimo no puede ser negativo'),

    body('unidadMedida')
        .optional()
        .isIn(['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'])
        .withMessage('La unidad de medida no es válida'),

    verificarValidacion
];

const validarToggleEstado = [
    body('activar')
        .notEmpty().withMessage('El campo activar es obligatorio')
        .isBoolean().withMessage('activar debe ser verdadero o falso'),

    verificarValidacion
];

const validarAjustarStock = [
    body('cantidadStock')
        .notEmpty().withMessage('La cantidad de stock es obligatoria')
        .isInt({ min: 0 }).withMessage('El stock no puede ser negativo'),

    verificarValidacion
];

const validarIdProducto = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearProducto,
    validarActualizarProducto,
    validarToggleEstado,
    validarAjustarStock,
    validarIdProducto
};