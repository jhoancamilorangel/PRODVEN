const { body, param, query, validationResult } = require('express-validator');
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

const UNIDADES_VALIDAS = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'];

// =====================================================
// BILL OF MATERIALS
// =====================================================

const validarCrearBom = [
    body('idProducto')
        .trim()
        .notEmpty().withMessage('El producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    body('nombreVersion')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('El nombre de versión no puede superar 100 caracteres'),

    body('cantidadProduce')
        .optional()
        .isFloat({ gt: 0 }).withMessage('La cantidad que produce debe ser mayor a cero'),

    body('unidadProduccion')
        .optional()
        .isIn(UNIDADES_VALIDAS).withMessage('La unidad de producción no es válida'),

    body('tiempoEstimadoMinutos')
        .optional({ checkFalsy: true })
        .isInt({ min: 0 }).withMessage('El tiempo estimado debe ser un número positivo'),

    body('costoManoObraUnitario')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo de mano de obra no puede ser negativo'),

    body('costoIndirectoUnitario')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo indirecto no puede ser negativo'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('La descripción no puede superar 2000 caracteres'),

    body('instruccionesFabricacion')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('Las instrucciones no pueden superar 5000 caracteres'),

    verificarValidacion
];

const validarAgregarComponente = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID del BOM es obligatorio')
        .isUUID(4).withMessage('El ID del BOM no es válido'),

    body('idProductoComponente')
        .trim()
        .notEmpty().withMessage('El producto componente es obligatorio')
        .isUUID(4).withMessage('El ID del componente no es válido'),

    body('cantidad')
        .notEmpty().withMessage('La cantidad es obligatoria')
        .isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor a cero'),

    body('unidadMedida')
        .optional()
        .isIn(UNIDADES_VALIDAS).withMessage('La unidad de medida no es válida'),

    body('porcentajeMerma')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('El porcentaje de merma debe estar entre 0 y 100'),

    body('esOpcional')
        .optional()
        .isBoolean().withMessage('esOpcional debe ser verdadero o falso'),

    body('esSustituible')
        .optional()
        .isBoolean().withMessage('esSustituible debe ser verdadero o falso'),

    body('idProductoSustituto')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID del producto sustituto no es válido'),

    body('ordenVisualizacion')
        .optional()
        .isInt({ min: 0 }).withMessage('El orden debe ser un número positivo'),

    body('notas')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('Las notas no pueden superar 255 caracteres'),

    verificarValidacion
];

const validarIdBom = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID del BOM es obligatorio')
        .isUUID(4).withMessage('El ID del BOM no es válido'),

    verificarValidacion
];

const validarIdComponente = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID del BOM es obligatorio')
        .isUUID(4).withMessage('El ID del BOM no es válido'),

    param('idComp')
        .trim()
        .notEmpty().withMessage('El ID del componente es obligatorio')
        .isUUID(4).withMessage('El ID del componente no es válido'),

    verificarValidacion
];

const validarIdProductoParam = [
    param('idProducto')
        .trim()
        .notEmpty().withMessage('El ID del producto es obligatorio')
        .isUUID(4).withMessage('El ID del producto no es válido'),

    verificarValidacion
];

// =====================================================
// ÓRDENES DE PRODUCCIÓN
// =====================================================

const validarCrearOrden = [
    body('idProducto')
        .trim()
        .notEmpty().withMessage('El producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    body('cantidadProducir')
        .notEmpty().withMessage('La cantidad a producir es obligatoria')
        .isFloat({ gt: 0 }).withMessage('La cantidad a producir debe ser mayor a cero'),

    body('idBodega')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de bodega no es válido'),

    body('prioridad')
        .optional()
        .isIn(['baja', 'normal', 'alta', 'urgente']).withMessage('La prioridad no es válida'),

    body('fechaPlanificada')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La fecha planificada debe ser válida'),

    body('idResponsableProduccion')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID del responsable no es válido'),

    body('observaciones')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Las observaciones no pueden superar 2000 caracteres'),

    verificarValidacion
];

const validarCompletarOrden = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de la orden es obligatorio')
        .isUUID(4).withMessage('El ID de la orden no es válido'),

    body('cantidadProducida')
        .notEmpty().withMessage('La cantidad producida es obligatoria')
        .isFloat({ gt: 0 }).withMessage('La cantidad producida debe ser mayor a cero'),

    body('cantidadDefectuosa')
        .optional()
        .isFloat({ min: 0 }).withMessage('La cantidad defectuosa no puede ser negativa'),

    body('costoManoObra')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo de mano de obra no puede ser negativo'),

    body('costoIndirecto')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo indirecto no puede ser negativo'),

    body('mermas')
        .optional()
        .isArray().withMessage('Las mermas deben ser un array')
        .custom((value) => {
            for (const merma of value) {
                if (!merma.idProductoComponente || merma.cantidadMerma === undefined) {
                    throw new Error('Cada merma debe tener idProductoComponente y cantidadMerma');
                }
            }
            return true;
        }),

    verificarValidacion
];

const validarCancelarOrden = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de la orden es obligatorio')
        .isUUID(4).withMessage('El ID de la orden no es válido'),

    body('motivo')
        .trim()
        .notEmpty().withMessage('El motivo de cancelación es obligatorio')
        .isLength({ min: 5, max: 500 }).withMessage('El motivo debe tener entre 5 y 500 caracteres'),

    verificarValidacion
];

const validarIdOrden = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de la orden es obligatorio')
        .isUUID(4).withMessage('El ID de la orden no es válido'),

    verificarValidacion
];

module.exports = {
    validarCrearBom,
    validarAgregarComponente,
    validarIdBom,
    validarIdComponente,
    validarIdProductoParam,
    validarCrearOrden,
    validarCompletarOrden,
    validarCancelarOrden,
    validarIdOrden
};