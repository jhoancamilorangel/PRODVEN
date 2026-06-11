const logger = require('../config/logger');

/**
 * WebhookHandler - Procesador de Notificaciones de Pasarelas
 *
 * Recibe las notificaciones (webhooks) que las pasarelas envían cuando
 * un pago cambia de estado, valida su autenticidad mediante la firma,
 * y las traduce al formato interno para que el servicio de pagos actúe.
 *
 * Es agnóstico de la pasarela: recibe un adapter que cumple el contrato
 * PaymentGateway y delega en él la validación e interpretación específica.
 *
 * Muchos métodos (PSE, Efecty, Baloto) confirman de forma asíncrona,
 * por lo que este flujo es esencial para conocer el resultado real.
 */
class WebhookHandler {
    /**
     * @param {PaymentGateway} gateway - Adapter de la pasarela (ej: PayuAdapter)
     */
    constructor(gateway) {
        if (!gateway) {
            throw new Error('WebhookHandler requiere una pasarela (gateway) para funcionar');
        }
        this.gateway = gateway;
    }

    /**
     * Procesa un webhook entrante de principio a fin
     *
     * 1. Valida la firma para confirmar que viene de la pasarela real
     * 2. Interpreta el payload traduciéndolo al formato interno
     * 3. Devuelve un resultado normalizado listo para que el servicio actúe
     *
     * @param {object} payload - Datos crudos recibidos de la pasarela
     * @param {string} ipOrigen - IP desde la que llegó la notificación
     * @returns {object} { valido, procesable, datos, mensaje }
     */
    procesar(payload, ipOrigen = null) {
        if (!payload || Object.keys(payload).length === 0) {
            logger.warn('Webhook recibido sin contenido');
            return {
                valido: false,
                procesable: false,
                datos: null,
                mensaje: 'El webhook no contiene datos'
            };
        }

        const firmaValida = this.gateway.validarFirmaWebhook(payload);

        if (!firmaValida) {
            logger.warn(`Webhook con firma inválida desde IP ${ipOrigen || 'desconocida'}`);
            return {
                valido: false,
                procesable: false,
                datos: null,
                mensaje: 'La firma del webhook no es válida. Posible intento de fraude.'
            };
        }

        const interpretado = this.gateway.interpretarWebhook(payload);

        if (!interpretado.referencia) {
            logger.warn('Webhook válido pero sin referencia de pago identificable');
            return {
                valido: true,
                procesable: false,
                datos: interpretado,
                mensaje: 'El webhook es auténtico pero no se pudo identificar el pago'
            };
        }

        logger.info(`Webhook válido procesado: referencia ${interpretado.referencia}, estado ${interpretado.estado}`);

        return {
            valido: true,
            procesable: true,
            datos: interpretado,
            mensaje: 'Webhook validado e interpretado correctamente'
        };
    }

    /**
     * Determina si un cambio de estado debe aplicarse
     *
     * Protege contra retrocesos de estado. Por ejemplo, si un pago ya está
     * completado, un webhook tardío que diga "pendiente" no debe revertirlo.
     *
     * @param {string} estadoActual - Estado actual del pago en el sistema
     * @param {string} estadoNuevo - Estado que propone el webhook
     * @returns {boolean} true si la transición es válida
     */
    debeAplicarCambio(estadoActual, estadoNuevo) {
        const estadosFinales = ['completado', 'reembolso', 'cancelado', 'expirado'];

        if (estadosFinales.includes(estadoActual)) {
            if (estadoActual === 'completado' && estadoNuevo === 'reembolso') {
                return true;
            }
            return false;
        }

        if (estadoActual === estadoNuevo) {
            return false;
        }

        return true;
    }
}

module.exports = WebhookHandler;