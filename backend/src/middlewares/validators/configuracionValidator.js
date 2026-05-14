const { body, validationResult } = require('express-validator');
const { sendResponse } = require('../../utils/response');

/**
 * Middleware que verifica si hubo errores de validación
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
 * Regex para validar colores hexadecimales
 */
const REGEX_COLOR_HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Validador completo para actualizar toda la configuración
 * Todos los campos son opcionales: solo se actualizan los que se envían
 */
const validarConfiguracionCompleta = [
    // ===== PERSONALIZACIÓN VISUAL =====
    body('colorPrimario')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorPrimario debe estar en formato #RRGGBB'),

    body('colorSecundario')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorSecundario debe estar en formato #RRGGBB'),

    body('colorTexto')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorTexto debe estar en formato #RRGGBB'),

    body('colorFondo')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorFondo debe estar en formato #RRGGBB'),

    body('fuentePrincipal')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La fuente no puede superar 100 caracteres'),

    // ===== CONFIGURACIÓN REGIONAL =====
    body('moneda')
        .optional()
        .trim()
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser código ISO de 3 letras')
        .isUppercase().withMessage('La moneda debe estar en mayúsculas'),

    body('simboloMoneda')
        .optional()
        .trim()
        .isLength({ min: 1, max: 5 }).withMessage('El símbolo de moneda debe tener entre 1 y 5 caracteres'),

    body('posicionSimboloMoneda')
        .optional()
        .isIn(['antes', 'despues']).withMessage('La posición debe ser "antes" o "despues"'),

    body('separadorDecimal')
        .optional()
        .isLength({ min: 1, max: 1 }).withMessage('El separador decimal debe ser exactamente 1 carácter')
        .isIn([',', '.']).withMessage('El separador decimal debe ser coma o punto'),

    body('separadorMiles')
        .optional()
        .isLength({ min: 1, max: 1 }).withMessage('El separador de miles debe ser exactamente 1 carácter')
        .isIn([',', '.', ' ']).withMessage('El separador de miles debe ser coma, punto o espacio'),

    body('zonaHoraria')
        .optional()
        .trim()
        .matches(/^[A-Za-z_]+\/[A-Za-z_]+$/).withMessage('La zona horaria debe estar en formato IANA (ej: America/Bogota)'),

    body('idiomaPorDefecto')
        .optional()
        .trim()
        .matches(/^[a-z]{2}-[A-Z]{2}$/).withMessage('El idioma debe estar en formato "xx-XX" (ej: es-CO)'),

    body('formatoFecha')
        .optional()
        .trim()
        .isLength({ max: 20 }).withMessage('El formato de fecha no puede superar 20 caracteres'),

    // ===== CONFIGURACIÓN FISCAL =====
    body('iva')
        .optional()
        .isFloat({ min: 0, max: 100 }).withMessage('El IVA debe estar entre 0 y 100'),

    body('aplicaIva')
        .optional()
        .isBoolean().withMessage('aplicaIva debe ser verdadero o falso'),

    body('prefijoFactura')
        .optional()
        .trim()
        .isLength({ min: 1, max: 10 }).withMessage('El prefijo debe tener entre 1 y 10 caracteres')
        .matches(/^[A-Z0-9\-]+$/).withMessage('El prefijo solo puede contener letras mayúsculas, números y guiones'),

    body('consecutivoFactura')
        .optional()
        .isInt({ min: 1 }).withMessage('El consecutivo debe ser un número entero mayor a 0'),

    body('piePaginaFactura')
        .optional()
        .trim()
        .isLength({ max: 2000 }).withMessage('El pie de página no puede superar 2000 caracteres'),

    // ===== MÉTODOS DE PAGO =====
    body('aceptaEfectivo')
        .optional()
        .isBoolean().withMessage('aceptaEfectivo debe ser verdadero o falso'),

    body('aceptaTarjetaCredito')
        .optional()
        .isBoolean().withMessage('aceptaTarjetaCredito debe ser verdadero o falso'),

    body('aceptaTarjetaDebito')
        .optional()
        .isBoolean().withMessage('aceptaTarjetaDebito debe ser verdadero o falso'),

    body('aceptaTransferencia')
        .optional()
        .isBoolean().withMessage('aceptaTransferencia debe ser verdadero o falso'),

    body('aceptaPse')
        .optional()
        .isBoolean().withMessage('aceptaPse debe ser verdadero o falso'),

    body('aceptaNequi')
        .optional()
        .isBoolean().withMessage('aceptaNequi debe ser verdadero o falso'),

    body('aceptaDaviplata')
        .optional()
        .isBoolean().withMessage('aceptaDaviplata debe ser verdadero o falso'),

    body('aceptaPayU')
        .optional()
        .isBoolean().withMessage('aceptaPayU debe ser verdadero o falso'),

    body('cuentasBancarias')
        .optional()
        .isArray().withMessage('Las cuentas bancarias deben ser un array')
        .custom((value) => {
            if (!Array.isArray(value)) return true;
            for (const cuenta of value) {
                if (!cuenta.banco || !cuenta.tipo || !cuenta.numero) {
                    throw new Error('Cada cuenta debe tener banco, tipo y número');
                }
            }
            return true;
        }),

    // ===== CONFIGURACIÓN DE PEDIDOS =====
    body('montoMinimoPedido')
        .optional()
        .isFloat({ min: 0 }).withMessage('El monto mínimo de pedido no puede ser negativo'),

    body('montoMinimoDomicilio')
        .optional()
        .isFloat({ min: 0 }).withMessage('El monto mínimo de domicilio no puede ser negativo'),

    body('costoDomicilioBase')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo de domicilio no puede ser negativo'),

    body('tiempoEstimadoPreparacionMin')
        .optional()
        .isInt({ min: 0, max: 1440 }).withMessage('El tiempo de preparación debe estar entre 0 y 1440 minutos'),

    body('tiempoEstimadoEntregaMin')
        .optional()
        .isInt({ min: 0, max: 1440 }).withMessage('El tiempo de entrega debe estar entre 0 y 1440 minutos'),

    body('permitePedidosProgramados')
        .optional()
        .isBoolean().withMessage('permitePedidosProgramados debe ser verdadero o falso'),

    body('diasProgramacionAdelantada')
        .optional()
        .isInt({ min: 1, max: 90 }).withMessage('Los días de programación deben estar entre 1 y 90'),

    // ===== NOTIFICACIONES =====
    body('notificarNuevoPedido')
        .optional()
        .isBoolean().withMessage('notificarNuevoPedido debe ser verdadero o falso'),

    body('notificarStockBajo')
        .optional()
        .isBoolean().withMessage('notificarStockBajo debe ser verdadero o falso'),

    body('notificarNuevaResena')
        .optional()
        .isBoolean().withMessage('notificarNuevaResena debe ser verdadero o falso'),

    body('canalNotificacionPedidos')
        .optional()
        .isIn(['email', 'push', 'ambos', 'ninguno'])
        .withMessage('El canal debe ser email, push, ambos o ninguno'),

    body('sonidoNotificacion')
        .optional()
        .isBoolean().withMessage('sonidoNotificacion debe ser verdadero o falso'),

    // ===== POLÍTICAS Y MENSAJES =====
    body('mensajeBienvenida')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('El mensaje de bienvenida no puede superar 1000 caracteres'),

    body('politicaDevoluciones')
        .optional()
        .trim()
        .isLength({ max: 10000 }).withMessage('La política de devoluciones no puede superar 10000 caracteres'),

    body('politicaPrivacidad')
        .optional()
        .trim()
        .isLength({ max: 10000 }).withMessage('La política de privacidad no puede superar 10000 caracteres'),

    body('terminosCondiciones')
        .optional()
        .trim()
        .isLength({ max: 10000 }).withMessage('Los términos y condiciones no pueden superar 10000 caracteres'),

    body('mensajeAgradecimiento')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('El mensaje de agradecimiento no puede superar 1000 caracteres'),

    // ===== INTEGRACIONES =====
    body('googleAnalyticsId')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^(G-|UA-|GTM-)[A-Z0-9\-]+$/i)
        .withMessage('El ID de Google Analytics no tiene un formato válido'),

    body('facebookPixelId')
        .optional({ checkFalsy: true })
        .trim()
        .matches(/^[0-9]+$/).withMessage('El Facebook Pixel ID debe contener solo números'),

    body('webhookPedidos')
        .optional({ checkFalsy: true })
        .trim()
        .isURL({ protocols: ['https'], require_protocol: true })
        .withMessage('El webhook debe ser una URL HTTPS válida'),

    // ===== SEGURIDAD =====
    body('requiere2faAdmin')
        .optional()
        .isBoolean().withMessage('requiere2faAdmin debe ser verdadero o falso'),

    body('sesionMaxMinutos')
        .optional()
        .isInt({ min: 15, max: 1440 }).withMessage('La sesión máxima debe estar entre 15 y 1440 minutos'),

    body('modoMantenimiento')
        .optional()
        .isBoolean().withMessage('modoMantenimiento debe ser verdadero o falso'),

    body('mensajeMantenimiento')
        .optional()
        .trim()
        .isLength({ max: 1000 }).withMessage('El mensaje de mantenimiento no puede superar 1000 caracteres'),

    verificarValidacion
];

/**
 * Validador específico para actualizar solo los colores corporativos
 * Lo usamos en endpoints específicos tipo PATCH /configuracion/colores
 */
const validarColores = [
    body('colorPrimario')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorPrimario debe estar en formato #RRGGBB'),

    body('colorSecundario')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorSecundario debe estar en formato #RRGGBB'),

    body('colorTexto')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorTexto debe estar en formato #RRGGBB'),

    body('colorFondo')
        .optional()
        .matches(REGEX_COLOR_HEX).withMessage('colorFondo debe estar en formato #RRGGBB'),

    body('fuentePrincipal')
        .optional()
        .trim()
        .isLength({ max: 100 }).withMessage('La fuente no puede superar 100 caracteres'),

    verificarValidacion
];

/**
 * Validador específico para actualizar horarios de atención
 * Lo usamos en endpoints específicos tipo PATCH /configuracion/horarios
 */
const validarHorarios = [
    body('horarioAtencion')
        .notEmpty().withMessage('El horario de atención es obligatorio')
        .isObject().withMessage('El horario debe ser un objeto')
        .custom((value) => {
            const diasValidos = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo'];
            const claves = Object.keys(value);

            for (const clave of claves) {
                if (!diasValidos.includes(clave)) {
                    throw new Error(`Día inválido: ${clave}. Use lunes, martes, miercoles, jueves, viernes, sabado o domingo`);
                }

                const dia = value[clave];

                if (typeof dia.abierto !== 'boolean') {
                    throw new Error(`El campo abierto del ${clave} debe ser true o false`);
                }

                if (dia.abierto === true) {
                    if (!dia.apertura || !dia.cierre) {
                        throw new Error(`Si ${clave} está abierto, debe tener apertura y cierre`);
                    }

                    const regexHora = /^([01]\d|2[0-3]):[0-5]\d$/;
                    if (!regexHora.test(dia.apertura)) {
                        throw new Error(`La hora de apertura del ${clave} debe estar en formato HH:MM`);
                    }
                    if (!regexHora.test(dia.cierre)) {
                        throw new Error(`La hora de cierre del ${clave} debe estar en formato HH:MM`);
                    }
                }
            }

            return true;
        }),

    verificarValidacion
];

module.exports = {
    validarConfiguracionCompleta,
    validarColores,
    validarHorarios
};