const crypto = require('crypto');
const PaymentGateway = require('./PaymentGateway');
const logger = require('../config/logger');

/**
 * PayuAdapter - Implementación de PayU Latam
 *
 * Implementa el contrato PaymentGateway para la pasarela PayU.
 * Maneja la firma MD5, las peticiones a su API y la traducción de estados.
 *
 * Documentación base: https://developers.payulatam.com
 */
class PayuAdapter extends PaymentGateway {
    constructor(config = {}) {
        super(config);
        this.nombre = 'PayU';

        this.apiLogin = config.apiLogin || process.env.PAYU_API_LOGIN;
        this.apiKey = config.apiKey || process.env.PAYU_API_KEY;
        this.merchantId = config.merchantId || process.env.PAYU_MERCHANT_ID;
        this.accountId = config.accountId || process.env.PAYU_ACCOUNT_ID;
        this.esProduccion = process.env.PAYU_MODO === 'produccion';

        this.urlApi = this.esProduccion
            ? 'https://api.payulatam.com/payments-api/4.0/service.cgi'
            : 'https://sandbox.api.payulatam.com/payments-api/4.0/service.cgi';

        this.urlReportes = this.esProduccion
            ? 'https://api.payulatam.com/reports-api/4.0/service.cgi'
            : 'https://sandbox.api.payulatam.com/reports-api/4.0/service.cgi';
    }

    /**
     * Genera la firma MD5 que PayU exige
     * Formato: ApiKey~merchantId~referenceCode~amount~currency
     */
    generarFirma(referencia, monto, moneda) {
        const cadena = `${this.apiKey}~${this.merchantId}~${referencia}~${monto}~${moneda}`;
        return crypto.createHash('md5').update(cadena).digest('hex');
    }

    /**
     * Verifica la firma de confirmación que PayU envía en los webhooks
     * Formato: ApiKey~merchantId~referenceCode~newValue~currency~statePol
     */
    verificarFirmaConfirmacion(payload) {
        const montoFormateado = parseFloat(payload.value).toFixed(1);
        const cadena = `${this.apiKey}~${this.merchantId}~${payload.reference_sale}~${montoFormateado}~${payload.currency}~${payload.state_pol}`;
        const firmaCalculada = crypto.createHash('md5').update(cadena).digest('hex');
        return firmaCalculada === payload.sign;
    }

    /**
     * Construye el objeto comprador para la petición a PayU
     */
    construirComprador(comprador) {
        return {
            merchantBuyerId: comprador.id || '1',
            fullName: comprador.nombre || 'APPROVED',
            emailAddress: comprador.correo || 'comprador@prueba.com',
            contactPhone: comprador.telefono || '7563126',
            dniNumber: comprador.documento || '5415668464654',
            shippingAddress: {
                street1: comprador.direccion || 'Calle 100',
                city: comprador.ciudad || 'Bogota',
                country: comprador.pais || 'CO'
            }
        };
    }

    /**
     * Inicia un pago en PayU
     */
    async iniciarPago(datosPago) {
        try {
            const montoFormateado = parseFloat(datosPago.monto).toFixed(2);
            const firma = this.generarFirma(datosPago.referencia, montoFormateado, datosPago.moneda);
            const comprador = this.construirComprador(datosPago.comprador || {});

            const peticion = {
                language: 'es',
                command: 'SUBMIT_TRANSACTION',
                merchant: {
                    apiLogin: this.apiLogin,
                    apiKey: this.apiKey
                },
                transaction: {
                    order: {
                        accountId: this.accountId,
                        referenceCode: datosPago.referencia,
                        description: datosPago.descripcion || 'Pago ProdVen',
                        language: 'es',
                        signature: firma,
                        additionalValues: {
                            TX_VALUE: {
                                value: parseFloat(montoFormateado),
                                currency: datosPago.moneda
                            }
                        },
                        buyer: comprador
                    },
                    type: 'AUTHORIZATION_AND_CAPTURE',
                    paymentMethod: this.mapearMetodoPago(datosPago.metodo),
                    paymentCountry: 'CO',
                    deviceSessionId: 'prodven' + Date.now(),
                    ipAddress: '127.0.0.1',
                    cookie: 'cookie_' + Date.now(),
                    userAgent: 'ProdVen/1.0',
                    extraParameters: {
                        INSTALLMENTS_NUMBER: 1
                    }
                },
                test: !this.esProduccion
            };

            if (datosPago.tarjeta) {
                peticion.transaction.creditCard = {
                    number: datosPago.tarjeta.numero,
                    securityCode: datosPago.tarjeta.cvv,
                    expirationDate: datosPago.tarjeta.expiracion,
                    name: datosPago.tarjeta.nombre
                };
                peticion.transaction.payer = {
                    fullName: comprador.fullName,
                    emailAddress: comprador.emailAddress,
                    contactPhone: comprador.contactPhone,
                    dniNumber: comprador.dniNumber,
                    billingAddress: {
                        street1: comprador.shippingAddress.street1,
                        city: comprador.shippingAddress.city,
                        country: comprador.shippingAddress.country
                    }
                };
            }

            const respuesta = await this.enviarPeticion(this.urlApi, peticion);

            if (respuesta.code === 'SUCCESS' && respuesta.transactionResponse) {
                const tr = respuesta.transactionResponse;
                return {
                    exito: true,
                    estado: this.mapearEstado(tr.state),
                    referenciaPasarela: datosPago.referencia,
                    orderId: tr.orderId ? String(tr.orderId) : null,
                    transactionId: tr.transactionId || null,
                    codigoRespuesta: tr.responseCode || tr.state,
                    mensaje: tr.responseMessage || tr.state,
                    datos: respuesta
                };
            }

            return {
                exito: false,
                estado: 'fallido',
                referenciaPasarela: datosPago.referencia,
                codigoRespuesta: respuesta.code || 'ERROR',
                mensaje: respuesta.error || 'Error al procesar el pago en PayU',
                datos: respuesta
            };
        } catch (error) {
            logger.error(`Error en PayuAdapter.iniciarPago: ${error.message}`);
            return {
                exito: false,
                estado: 'fallido',
                referenciaPasarela: datosPago.referencia,
                codigoRespuesta: 'EXCEPTION',
                mensaje: error.message,
                datos: null
            };
        }
    }

    /**
     * Consulta el estado de un pago en PayU usando su referencia
     */
    async consultarEstado(referencia) {
        try {
            const peticion = {
                language: 'es',
                command: 'ORDER_DETAIL_BY_REFERENCE_CODE',
                merchant: {
                    apiLogin: this.apiLogin,
                    apiKey: this.apiKey
                },
                details: {
                    referenceCode: referencia
                },
                test: !this.esProduccion
            };

            const respuesta = await this.enviarPeticion(this.urlReportes, peticion);

            if (respuesta.code === 'SUCCESS' && respuesta.result && respuesta.result.payload) {
                const orden = Array.isArray(respuesta.result.payload)
                    ? respuesta.result.payload[0]
                    : respuesta.result.payload;

                const transaccion = orden.transactions && orden.transactions[0];
                const estadoPayu = transaccion ? transaccion.transactionResponse.state : 'PENDING';

                return {
                    exito: true,
                    estado: this.mapearEstado(estadoPayu),
                    datos: respuesta
                };
            }

            return {
                exito: false,
                estado: 'pendiente',
                datos: respuesta
            };
        } catch (error) {
            logger.error(`Error en PayuAdapter.consultarEstado: ${error.message}`);
            return { exito: false, estado: 'pendiente', datos: null };
        }
    }

    /**
     * Procesa un reembolso de un pago aprobado
     */
    async procesarReembolso(datosReembolso) {
        try {
            const peticion = {
                language: 'es',
                command: 'SUBMIT_TRANSACTION',
                merchant: {
                    apiLogin: this.apiLogin,
                    apiKey: this.apiKey
                },
                transaction: {
                    order: { id: datosReembolso.orderId },
                    type: 'REFUND',
                    reason: datosReembolso.motivo || 'Reembolso solicitado',
                    parentTransactionId: datosReembolso.transactionId
                },
                test: !this.esProduccion
            };

            const respuesta = await this.enviarPeticion(this.urlApi, peticion);

            const exito = respuesta.code === 'SUCCESS'
                && respuesta.transactionResponse
                && ['PENDING', 'APPROVED'].includes(respuesta.transactionResponse.state);

            return {
                exito,
                mensaje: respuesta.transactionResponse
                    ? respuesta.transactionResponse.responseMessage
                    : (respuesta.error || 'Respuesta desconocida'),
                datos: respuesta
            };
        } catch (error) {
            logger.error(`Error en PayuAdapter.procesarReembolso: ${error.message}`);
            return { exito: false, mensaje: error.message, datos: null };
        }
    }

    /**
     * Valida la firma de un webhook entrante
     */
    validarFirmaWebhook(payload) {
        try {
            return this.verificarFirmaConfirmacion(payload);
        } catch (error) {
            logger.error(`Error al validar firma de webhook: ${error.message}`);
            return false;
        }
    }

    /**
     * Interpreta el webhook de PayU y lo traduce al formato interno
     */
    interpretarWebhook(payload) {
        return {
            referencia: payload.reference_sale,
            estado: this.mapearEstadoConfirmacion(payload.state_pol),
            orderId: payload.reference_pol ? String(payload.reference_pol) : null,
            transactionId: payload.transaction_id || null,
            monto: payload.value ? parseFloat(payload.value) : null,
            codigoRespuesta: payload.response_code_pol || payload.state_pol,
            mensaje: payload.response_message_pol || null,
            datos: payload
        };
    }

    /**
     * Mapea el estado de la API de pagos de PayU al estado interno
     */
    mapearEstado(estadoPayu) {
        const mapa = {
            APPROVED: 'completado',
            DECLINED: 'rechazado',
            ERROR: 'fallido',
            PENDING: 'en_proceso',
            EXPIRED: 'expirado',
            SUBMITTED: 'en_proceso'
        };
        return mapa[estadoPayu] || 'pendiente';
    }

    /**
     * Mapea el estado de confirmación (webhook) de PayU al estado interno
     */
    mapearEstadoConfirmacion(statePol) {
        const mapa = {
            '4': 'completado',
            '6': 'rechazado',
            '5': 'expirado',
            '7': 'en_proceso',
            '104': 'fallido'
        };
        return mapa[String(statePol)] || 'pendiente';
    }

    /**
     * Mapea el método de pago interno al código de PayU
     */
    mapearMetodoPago(metodo) {
        const mapa = {
            tarjeta_credito: 'VISA',
            tarjeta_debito: 'VISA',
            pse: 'PSE',
            efecty: 'EFECTY',
            baloto: 'BALOTO',
            nequi: 'NEQUI',
            daviplata: 'DAVIPLATA'
        };
        return mapa[metodo] || 'VISA';
    }

    /**
     * Lista los métodos de pago soportados por PayU Colombia
     */
    metodosSoportados() {
        return [
            'tarjeta_credito',
            'tarjeta_debito',
            'pse',
            'efecty',
            'baloto',
            'nequi',
            'daviplata'
        ];
    }

    /**
     * Envía una petición HTTP a PayU usando fetch nativo de Node
     */
    async enviarPeticion(url, cuerpo) {
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(cuerpo)
        });

        if (!respuesta.ok) {
            throw new Error(`PayU respondió con estado HTTP ${respuesta.status}`);
        }

        return await respuesta.json();
    }
}

module.exports = PayuAdapter;