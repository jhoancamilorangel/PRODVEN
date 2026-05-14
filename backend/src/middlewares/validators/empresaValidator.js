const { body, param, query, validationResult } = require('express-validator');
const { sendResponse } = require('../../utils/response');

/**
 * Middleware que verifica si hubo errores de validación
 * y devuelve respuesta estandarizada en caso de fallo
 */
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
 * Validador para crear una nueva empresa
 * Solo lo usa SuperAdmin al registrar una nueva empresa en el sistema
 */
const validarCrearEmpresa = [
    body('nombre')
        .trim()
        .notEmpty().withMessage('El nombre de la empresa es obligatorio')
        .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

    body('razonSocial')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('La razón social no puede superar 200 caracteres'),

    body('nit')
        .optional()
        .trim()
        .isLength({ min: 5, max: 50 }).withMessage('El NIT debe tener entre 5 y 50 caracteres')
        .matches(/^[0-9A-Za-z\-\.]+$/).withMessage('El NIT contiene caracteres no permitidos'),

    body('tipoDocumento')
        .optional()
        .isIn(['NIT', 'RUT', 'CIF', 'RFC', 'CUIT', 'OTRO'])
        .withMessage('El tipo de documento no es válido'),

    body('correo')
        .trim()
        .notEmpty().withMessage('El correo es obligatorio')
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail()
        .isLength({ max: 150 }).withMessage('El correo no puede superar 150 caracteres'),

    body('telefono')
        .optional()
        .trim()
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono debe tener entre 7 y 20 caracteres')
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono solo puede contener números y símbolos válidos'),

    body('telefonoSecundario')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono secundario debe tener entre 7 y 20 caracteres')
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono secundario solo puede contener números y símbolos válidos'),

    body('direccion')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La dirección no puede superar 255 caracteres'),

    body('ciudad')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La ciudad no puede superar 100 caracteres'),

    body('departamento')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('El departamento no puede superar 100 caracteres'),

    body('pais')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('El país no puede superar 100 caracteres'),

    body('codigoPostal')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 20 }).withMessage('El código postal no puede superar 20 caracteres'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('La descripción no puede superar 5000 caracteres'),

    body('descripcionCorta')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La descripción corta no puede superar 255 caracteres'),

    body('categoria')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La categoría no puede superar 100 caracteres'),

    body('sitioWeb')
        .optional({ checkFalsy: true })
        .trim()
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('El sitio web debe ser una URL válida con http:// o https://'),

    body('redesSociales')
        .optional()
        .isObject().withMessage('Las redes sociales deben ser un objeto'),

    body('plan')
        .optional()
        .isIn(['free', 'basico', 'premium', 'enterprise'])
        .withMessage('El plan especificado no es válido'),

    verificarValidacion
];

/**
 * Validador para actualizar datos de una empresa
 * Acepta los mismos campos que crear, pero todos son opcionales
 */
const validarActualizarEmpresa = [
    body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2, max: 150 }).withMessage('El nombre debe tener entre 2 y 150 caracteres'),

    body('razonSocial')
        .optional()
        .trim()
        .isLength({ max: 200 }).withMessage('La razón social no puede superar 200 caracteres'),

    body('nit')
        .optional()
        .trim()
        .isLength({ min: 5, max: 50 }).withMessage('El NIT debe tener entre 5 y 50 caracteres')
        .matches(/^[0-9A-Za-z\-\.]+$/).withMessage('El NIT contiene caracteres no permitidos'),

    body('tipoDocumento')
        .optional()
        .isIn(['NIT', 'RUT', 'CIF', 'RFC', 'CUIT', 'OTRO'])
        .withMessage('El tipo de documento no es válido'),

    body('correo')
        .optional()
        .trim()
        .isEmail().withMessage('El correo no tiene un formato válido')
        .normalizeEmail()
        .isLength({ max: 150 }).withMessage('El correo no puede superar 150 caracteres'),

    body('telefono')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono debe tener entre 7 y 20 caracteres')
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono solo puede contener números y símbolos válidos'),

    body('telefonoSecundario')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono secundario debe tener entre 7 y 20 caracteres')
        .matches(/^[0-9+\-\s()]+$/).withMessage('El teléfono secundario solo puede contener números y símbolos válidos'),

    body('direccion')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La dirección no puede superar 255 caracteres'),

    body('ciudad')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La ciudad no puede superar 100 caracteres'),

    body('departamento')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('El departamento no puede superar 100 caracteres'),

    body('pais')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('El país no puede superar 100 caracteres'),

    body('codigoPostal')
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 20 }).withMessage('El código postal no puede superar 20 caracteres'),

    body('descripcion')
        .optional()
        .trim()
        .isLength({ max: 5000 }).withMessage('La descripción no puede superar 5000 caracteres'),

    body('descripcionCorta')
        .optional()
        .trim()
        .isLength({ max: 255 }).withMessage('La descripción corta no puede superar 255 caracteres'),

    body('categoria')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La categoría no puede superar 100 caracteres'),

    body('sitioWeb')
        .optional({ checkFalsy: true })
        .trim()
        .isURL({ protocols: ['http', 'https'], require_protocol: true })
        .withMessage('El sitio web debe ser una URL válida con http:// o https://'),

    body('redesSociales')
        .optional()
        .isObject().withMessage('Las redes sociales deben ser un objeto'),

    body('horarioAtencion')
        .optional()
        .isObject().withMessage('El horario de atención debe ser un objeto'),

    body('aceptaDomicilios')
        .optional()
        .isBoolean().withMessage('aceptaDomicilios debe ser verdadero o falso'),

    body('aceptaRecogerEnTienda')
        .optional()
        .isBoolean().withMessage('aceptaRecogerEnTienda debe ser verdadero o falso'),

    verificarValidacion
];

/**
 * Validador para cambiar el modo público del marketplace
 */
const validarToggleMarketplace = [
    body('modoPublico')
        .notEmpty().withMessage('El campo modoPublico es obligatorio')
        .isBoolean().withMessage('modoPublico debe ser verdadero o falso'),

    verificarValidacion
];

/**
 * Validador para parámetros de URL que esperan un UUID
 * Lo usamos en rutas tipo /empresas/:id
 */
const validarIdEmpresa = [
    param('id')
        .trim()
        .notEmpty().withMessage('El ID de empresa es obligatorio')
        .isUUID(4).withMessage('El ID de empresa no es válido'),

    verificarValidacion
];

/**
 * Validador para query params de listado y búsqueda
 */
const validarListadoEmpresas = [
    query('pagina')
        .optional()
        .isInt({ min: 1 }).withMessage('La página debe ser un número entero mayor a 0'),

    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 }).withMessage('El límite debe estar entre 1 y 100'),

    query('estado')
        .optional()
        .isIn(['activa', 'inactiva', 'suspendida', 'pendiente_verificacion'])
        .withMessage('El estado especificado no es válido'),

    query('categoria')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La categoría no puede superar 100 caracteres'),

    query('busqueda')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('El término de búsqueda no puede superar 100 caracteres'),

    verificarValidacion
];

/**
 * Validador para crear o cambiar una suscripción
 * Solo lo usa SuperAdmin
 */
const validarSuscripcion = [
    body('plan')
        .trim()
        .notEmpty().withMessage('El plan es obligatorio')
        .isIn(['free', 'basico', 'premium', 'enterprise'])
        .withMessage('El plan especificado no es válido'),

    body('ciclo')
        .optional()
        .isIn(['mensual', 'trimestral', 'semestral', 'anual'])
        .withMessage('El ciclo de facturación no es válido'),

    body('renovacionAutomatica')
        .optional()
        .isBoolean().withMessage('renovacionAutomatica debe ser verdadero o falso'),

    body('moneda')
        .optional()
        .trim()
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser un código de 3 letras')
        .isUppercase().withMessage('La moneda debe estar en mayúsculas'),

    body('notasAdmin')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('Las notas no pueden superar 1000 caracteres'),

    verificarValidacion
];

/**
 * Validador para cancelar una suscripción
 */
const validarCancelarSuscripcion = [
    body('motivoCancelacion')
        .trim()
        .notEmpty().withMessage('El motivo de cancelación es obligatorio')
        .isLength({ min: 10, max: 1000 })
        .withMessage('El motivo debe tener entre 10 y 1000 caracteres'),

    verificarValidacion
];

module.exports = {
    validarCrearEmpresa,
    validarActualizarEmpresa,
    validarToggleMarketplace,
    validarIdEmpresa,
    validarListadoEmpresas,
    validarSuscripcion,
    validarCancelarSuscripcion
};