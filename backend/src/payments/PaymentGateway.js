/**
 * PaymentGateway - Interfaz Abstracta de Pasarela de Pago
 *
 * Define el contrato que toda pasarela de pago debe cumplir para integrarse
 * con ProdVen. Es la base del patrón Adapter: la lógica de negocio habla con
 * esta interfaz genérica, nunca con una pasarela concreta.
 *
 * Para agregar una pasarela nueva (Stripe, Wompi, Mercado Pago):
 *  1. Crear una clase que extienda PaymentGateway
 *  2. Implementar todos los métodos abstractos
 *  3. Registrarla en el servicio de pagos
 *
 * No se debe instanciar directamente. Sirve como contrato base.
 */
class PaymentGateway {
    constructor(config = {}) {
        if (new.target === PaymentGateway) {
            throw new Error('PaymentGateway es una clase abstracta y no puede instanciarse directamente');
        }
        this.config = config;
        this.nombre = 'GenericGateway';
    }

    /**
     * Inicia un pago en la pasarela
     *
     * @param {object} datosPago - Datos del pago
     * @param {number} datosPago.monto - Monto a cobrar
     * @param {string} datosPago.moneda - Moneda (ej: COP)
     * @param {string} datosPago.referencia - Referencia única del pago
     * @param {string} datosPago.descripcion - Descripción del pago
     * @param {object} datosPago.comprador - Datos del comprador
     * @param {string} datosPago.metodo - Método de pago
     * @returns {Promise<object>} Resultado con { exito, urlPago, referenciaPasarela, datos }
     */
    async iniciarPago(datosPago) {
        throw new Error(`El método iniciarPago debe ser implementado por ${this.nombre}`);
    }

    /**
     * Consulta el estado actual de un pago en la pasarela
     *
     * @param {string} referencia - Referencia del pago a consultar
     * @returns {Promise<object>} Resultado con { exito, estado, datos }
     */
    async consultarEstado(referencia) {
        throw new Error(`El método consultarEstado debe ser implementado por ${this.nombre}`);
    }

    /**
     * Procesa un reembolso de un pago previamente aprobado
     *
     * @param {object} datosReembolso - Datos del reembolso
     * @param {string} datosReembolso.referencia - Referencia del pago original
     * @param {string} datosReembolso.transactionId - ID de transacción de la pasarela
     * @param {number} datosReembolso.monto - Monto a reembolsar
     * @param {string} datosReembolso.motivo - Razón del reembolso
     * @returns {Promise<object>} Resultado con { exito, datos }
     */
    async procesarReembolso(datosReembolso) {
        throw new Error(`El método procesarReembolso debe ser implementado por ${this.nombre}`);
    }

    /**
     * Valida la firma de una notificación webhook entrante
     *
     * Cada pasarela firma sus webhooks de forma distinta. Este método
     * verifica que la notificación realmente venga de la pasarela y no
     * sea un intento de fraude.
     *
     * @param {object} payload - Datos recibidos en el webhook
     * @returns {boolean} true si la firma es válida
     */
    validarFirmaWebhook(payload) {
        throw new Error(`El método validarFirmaWebhook debe ser implementado por ${this.nombre}`);
    }

    /**
     * Interpreta una notificación webhook y la traduce al formato interno
     *
     * Convierte el formato específico de la pasarela al formato estándar
     * que entiende ProdVen.
     *
     * @param {object} payload - Datos recibidos en el webhook
     * @returns {object} { referencia, estado, transactionId, datos }
     */
    interpretarWebhook(payload) {
        throw new Error(`El método interpretarWebhook debe ser implementado por ${this.nombre}`);
    }

    /**
     * Traduce el estado nativo de la pasarela al estado interno de ProdVen
     *
     * Cada pasarela usa sus propios códigos de estado. Este método los
     * mapea a los estados que maneja el sistema (completado, fallido, etc).
     *
     * @param {string} estadoPasarela - Estado en el formato de la pasarela
     * @returns {string} Estado interno de ProdVen
     */
    mapearEstado(estadoPasarela) {
        throw new Error(`El método mapearEstado debe ser implementado por ${this.nombre}`);
    }

    /**
     * Devuelve la lista de métodos de pago que soporta esta pasarela
     *
     * @returns {Array<string>} Lista de métodos soportados
     */
    metodosSoportados() {
        throw new Error(`El método metodosSoportados debe ser implementado por ${this.nombre}`);
    }
}

module.exports = PaymentGateway;