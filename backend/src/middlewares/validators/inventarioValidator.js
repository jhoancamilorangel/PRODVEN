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

const TIPOS_MOVIMIENTO_VALIDOS = [
    'entrada_compra',
    'entrada_produccion',
    'entrada_devolucion',
    'entrada_ajuste',
    'entrada_inicial',
    'salida_venta',
    'salida_produccion',
    'salida_merma',
    'salida_ajuste',
    'salida_devolucion_proveedor'
];

// =====================================================
// MOVIMIENTOS DE INVENTARIO
// =====================================================

const validarRegistrarMovimiento = [
    body('idProducto')
        .trim()
        .notEmpty().withMessage('El producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    body('tipo')
        .trim()
        .notEmpty().withMessage('El tipo de movimiento es obligatorio')
        .isIn(TIPOS_MOVIMIENTO_VALIDOS).withMessage('El tipo de movimiento no es válido'),

    body('cantidad')
        .notEmpty().withMessage('La cantidad es obligatoria')
        .isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor a cero'),

    body('costoUnitario')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo unitario no puede ser negativo'),

    body('idBodega')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de bodega no es válido'),

    body('idProveedor')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de proveedor no es válido'),

    body('motivo')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('El motivo no puede superar 255 caracteres'),

    body('documentoSoporte')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 100 }).withMessage('El documento soporte no puede superar 100 caracteres'),

    body('numeroLote')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 50 }).withMessage('El número de lote no puede superar 50 caracteres'),

    body('fechaVencimiento')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La fecha de vencimiento debe ser una fecha válida'),

    body('observaciones')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('Las observaciones no pueden superar 2000 caracteres'),

    body('referencia')
        .optional()
        .isObject().withMessage('La referencia debe ser un objeto'),

    body('referencia.tipo')
        .optional()
        .trim()
        .isLength({ max: 50 }).withMessage('El tipo de referencia no puede superar 50 caracteres'),

    body('referencia.id')
        .optional()
        .isUUID(4).withMessage('El ID de referencia no es válido'),

    verificarValidacion
];

// =====================================================
// AJUSTE POR CONTEO FÍSICO
// =====================================================

const validarAjustePorConteo = [
    body('idProducto')
        .trim()
        .notEmpty().withMessage('El producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    body('cantidadFisicaReal')
        .notEmpty().withMessage('La cantidad física real es obligatoria')
        .isFloat({ min: 0 }).withMessage('La cantidad no puede ser negativa'),

    body('motivo')
        .trim()
        .notEmpty().withMessage('El motivo del ajuste es obligatorio')
        .isLength({ min: 5, max: 255 }).withMessage('El motivo debe tener entre 5 y 255 caracteres'),

    body('idBodega')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de bodega no es válido'),

    verificarValidacion
];

// =====================================================
// CONSULTA DE KARDEX
// =====================================================

const validarConsultaKardex = [
    param('idProducto')
        .trim()
        .notEmpty().withMessage('El ID de producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    query('idBodega')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de bodega no es válido'),

    query('fechaDesde')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La fecha desde debe ser una fecha válida'),

    query('fechaHasta')
        .optional({ checkFalsy: true })
        .isISO8601().withMessage('La fecha hasta debe ser una fecha válida'),

    query('tipo')
        .optional({ checkFalsy: true })
        .isIn(TIPOS_MOVIMIENTO_VALIDOS).withMessage('El tipo de movimiento no es válido'),

    query('pagina')
        .optional()
        .isInt({ min: 1 }).withMessage('La página debe ser un entero positivo'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 200 }).withMessage('El límite debe estar entre 1 y 200'),

    verificarValidacion
];

// =====================================================
// BODEGAS
// =====================================================

const validarCrearBodega = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre de la bodega es obligatorio')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('codigo')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 20 }).withMessage('El código no puede superar 20 caracteres')
        .matches(/^[A-Z0-9\-]+$/).withMessage('El código solo puede contener letras mayúsculas, números y guiones'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('La descripción no puede superar 1000 caracteres'),

    body('direccion')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La dirección no puede superar 255 caracteres'),

    body('ciudad')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La ciudad no puede superar 100 caracteres'),

    body('idResponsable')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID del responsable no es válido'),

    body('permiteVentas')
        .optional()
        .isBoolean().withMessage('permiteVentas debe ser verdadero o falso'),

    body('permiteProduccion')
        .optional()
        .isBoolean().withMessage('permiteProduccion debe ser verdadero o falso'),

    verificarValidacion
];

const validarActualizarBodega = [
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('codigo')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[A-Z0-9\-]+$/).withMessage('El código solo puede contener letras mayúsculas, números y guiones'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('La descripción no puede superar 1000 caracteres'),

    body('idResponsable')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID del responsable no es válido'),

    body('permiteVentas')
        .optional()
        .isBoolean().withMessage('permiteVentas debe ser verdadero o falso'),

    body('permiteProduccion')
        .optional()
        .isBoolean().withMessage('permiteProduccion debe ser verdadero o falso'),

    verificarValidacion
];

const validarIdBodega = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de bodega es obligatorio')
        .isUUID(4).withMessage('El ID de bodega no es válido'),

    verificarValidacion
];

// =====================================================
// RESERVAS DE STOCK
// =====================================================

const validarCrearReserva = [
    body('idProducto')
        .trim()
        .notEmpty().withMessage('El producto es obligatorio')
        .isUUID(4).withMessage('El ID de producto no es válido'),

    body('cantidad')
        .notEmpty().withMessage('La cantidad es obligatoria')
        .isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor a cero'),

    body('referencia')
        .notEmpty().withMessage('La referencia es obligatoria')
        .isObject().withMessage('La referencia debe ser un objeto'),

    body('referencia.tipo')
        .trim()
        .notEmpty().withMessage('El tipo de referencia es obligatorio')
        .isIn(['pedido', 'orden_produccion', 'manual']).withMessage('Tipo de referencia inválido'),

    body('referencia.id')
        .trim()
        .notEmpty().withMessage('El ID de referencia es obligatorio')
        .isUUID(4).withMessage('El ID de referencia no es válido'),

    body('idBodega')
        .optional({ checkFalsy: true })
        .isUUID(4).withMessage('El ID de bodega no es válido'),

    body('minutosExpiracion')
        .optional()
        .isInt({ min: 1, max: 1440 }).withMessage('Los minutos de expiración deben estar entre 1 y 1440'),

    body('observaciones')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Las observaciones no pueden superar 1000 caracteres'),

    verificarValidacion
];

const validarIdReserva = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de reserva es obligatorio')
        .isUUID(4).withMessage('El ID de reserva no es válido'),

    verificarValidacion
];

const validarLiberarReserva = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de reserva es obligatorio')
        .isUUID(4).withMessage('El ID de reserva no es válido'),

    body('motivo')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('El motivo no puede superar 255 caracteres'),

    verificarValidacion
];

module.exports = {
    validarRegistrarMovimiento,
    validarAjustePorConteo,
    validarConsultaKardex,
    validarCrearBodega,
    validarActualizarBodega,
    validarIdBodega,
    validarCrearReserva,
    validarIdReserva,
    validarLiberarReserva
};