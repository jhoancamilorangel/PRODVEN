const Pago = require('../../models/Pago');
const TransaccionPago = require('../../models/TransaccionPago');
const PayuAdapter = require('../../payments/PayuAdapter');
const WebhookHandler = require('../../payments/WebhookHandler');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');
const gestionPedidoService = require('./gestionPedidoService');
const notificacionEventos = require('./notificacionEventos');
/**
 * Servicio de Pagos
 *
 * Orquesta el ciclo completo de pagos conectando la capa de pasarelas
 * (PaymentGateway/PayuAdapter) con la lógica de negocio de ProdVen.
 *
 *  - Crear pagos para pedidos o suscripciones
 *  - Iniciar el cobro a través de la pasarela
 *  - Registrar cada transacción para auditoría
 *  - Procesar webhooks y actualizar estados
 *  - Gestionar reembolsos
 *
 * La pasarela concreta se instancia aquí, pero el resto del servicio
 * trabaja contra la abstracción, listo para cambiar de pasarela.
 */

/**
 * Obtiene la instancia de la pasarela configurada
 * En el futuro, esto podría elegir entre varias según configuración
 */
const obtenerPasarela = () => {
    return new PayuAdapter();
};

/**
 * Genera una referencia única para un pago
 * Formato: PRODVEN-AÑO-TIMESTAMP-ALEATORIO
 */
const generarReferencia = () => {
    const anio = new Date().getFullYear();
    const timestamp = Date.now();
    const aleatorio = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PRODVEN-${anio}-${timestamp}-${aleatorio}`;
};

/**
 * Registra una transacción de auditoría asociada a un pago
 */
const registrarTransaccion = async (datos, transaction = null) => {
    const opciones = transaction ? { transaction } : {};
    return await TransaccionPago.create({
        idEmpresa: datos.idEmpresa,
        idPago: datos.idPago,
        tipoEvento: datos.tipoEvento,
        estadoResultante: datos.estadoResultante || null,
        codigoRespuesta: datos.codigoRespuesta || null,
        mensajeRespuesta: datos.mensajeRespuesta || null,
        referenciaPayu: datos.referenciaPayu || null,
        orderIdPayu: datos.orderIdPayu || null,
        transactionIdPayu: datos.transactionIdPayu || null,
        monto: datos.monto || null,
        datosCompletos: datos.datosCompletos || null,
        ipOrigen: datos.ipOrigen || null
    }, opciones);
};

/**
 * Crea un pago e inicia el cobro a través de la pasarela
 *
 * @param {object} datos - Datos del pago
 * @param {string} idEmpresa - Empresa
 * @param {string} idUsuario - Usuario que origina el pago
 * @returns {Promise<object>} { exito, pago, resultadoPasarela, mensaje }
 */
const crearPago = async (datos, idEmpresa, idUsuario) => {
    const transaction = await sequelize.transaction();

    try {
        if (datos.tipoPago === 'pedido' && !datos.idPedido) {
            await transaction.rollback();
            return { exito: false, pago: null, mensaje: 'Un pago de pedido requiere idPedido' };
        }

        if (datos.tipoPago === 'suscripcion' && !datos.idSuscripcion) {
            await transaction.rollback();
            return { exito: false, pago: null, mensaje: 'Un pago de suscripción requiere idSuscripcion' };
        }

        const referencia = generarReferencia();

        const pago = await Pago.create({
            idEmpresa,
            tipoPago: datos.tipoPago,
            idPedido: datos.idPedido || null,
            idSuscripcion: datos.idSuscripcion || null,
            monto: datos.monto,
            moneda: datos.moneda || 'COP',
            metodo: datos.metodo,
            estado: 'pendiente',
            referencia,
            creadoPor: idUsuario
        }, { transaction });

        await registrarTransaccion({
            idEmpresa,
            idPago: pago.idPago,
            tipoEvento: 'intento',
            estadoResultante: 'pendiente',
            referenciaPayu: referencia,
            monto: datos.monto
        }, transaction);

        await transaction.commit();

        const pasarela = obtenerPasarela();

        const resultadoPasarela = await pasarela.iniciarPago({
            monto: datos.monto,
            moneda: datos.moneda || 'COP',
            referencia,
            descripcion: datos.descripcion || `Pago ${datos.tipoPago} ProdVen`,
            metodo: datos.metodo,
            comprador: datos.comprador || {},
            tarjeta: datos.tarjeta || null
        });

        const nuevoEstado = resultadoPasarela.exito ? resultadoPasarela.estado : 'fallido';

        pago.estado = nuevoEstado;
        pago.referenciaPayu = resultadoPasarela.referenciaPasarela || referencia;
        if (resultadoPasarela.estado === 'completado') {
            pago.fechaPago = new Date();
        }
        await pago.save();

        await registrarTransaccion({
            idEmpresa,
            idPago: pago.idPago,
            tipoEvento: 'respuesta',
            estadoResultante: nuevoEstado,
            codigoRespuesta: resultadoPasarela.codigoRespuesta,
            mensajeRespuesta: resultadoPasarela.mensaje,
            referenciaPayu: referencia,
            orderIdPayu: resultadoPasarela.orderId,
            transactionIdPayu: resultadoPasarela.transactionId,
            monto: datos.monto,
            datosCompletos: resultadoPasarela.datos
        });

        if (nuevoEstado === 'completado') {
            await aplicarPagoExitoso(pago);
        }

        logger.info(`Pago creado: ${pago.idPago} estado ${nuevoEstado} referencia ${referencia}`);

        return {
            exito: resultadoPasarela.exito,
            pago: pago.datosCompletos(),
            resultadoPasarela: {
                estado: nuevoEstado,
                mensaje: resultadoPasarela.mensaje,
                urlPago: resultadoPasarela.urlPago || null
            },
            mensaje: resultadoPasarela.exito
                ? 'Pago procesado correctamente'
                : `El pago no se completó: ${resultadoPasarela.mensaje}`
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear pago: ${error.message}`);
        throw error;
    }
};

/**
 * Aplica los efectos de un pago exitoso según su tipo
 * Actualiza el pedido o la suscripción correspondiente
 */
const aplicarPagoExitoso = async (pago) => {
    try {
        if (pago.tipoPago === 'suscripcion' && pago.idSuscripcion) {
            logger.info(`Pago de suscripción ${pago.idSuscripcion} completado. Lista para renovar.`);
        }

        if (pago.tipoPago === 'pedido' && pago.idPedido) {
            logger.info(`Pago de pedido ${pago.idPedido} completado. Confirmando pedido automáticamente.`);

            const Pedido = require('../../models/Pedido');
            const pedido = await Pedido.findByPk(pago.idPedido);

            if (!pedido) {
                logger.warn(`Pago exitoso pero el pedido ${pago.idPedido} no existe.`);
                return;
            }

            // Notificar al cliente que su pago se registró correctamente
            // (fire-and-forget; independiente de si el pedido se confirma o no)
            await notificacionEventos.notificarPagoExitoso(pago, pedido);

            // Validar que el monto pagado cubra el total del pedido
            const totalPedido = parseFloat(pedido.total);
            const montoPagado = parseFloat(pago.monto);

            if (montoPagado < totalPedido) {
                logger.warn(
                    `Pago de pedido ${pago.idPedido} insuficiente: pagado ${montoPagado}, total ${totalPedido}. No se confirma automáticamente.`
                );
                return;
            }

            // Solo confirmar si el pedido está pendiente (no pisar otros estados)
            if (pedido.estado !== 'pendiente') {
                logger.info(
                    `Pedido ${pago.idPedido} ya está en estado "${pedido.estado}", no se confirma de nuevo.`
                );
                return;
            }

            // Confirmar el pedido automáticamente por el pago
            const resultado = await gestionPedidoService.cambiarEstado(
                pedido.idPedido,
                pedido.idEmpresa,
                'confirmado',
                pago.creadoPor,
                { descripcion: `Pago recibido (ref: ${pago.referencia}). Pedido confirmado automáticamente.` }
            );

            if (resultado.exito) {
                logger.info(`Pedido ${pago.idPedido} confirmado automáticamente por pago exitoso.`);
            } else {
                logger.warn(`No se pudo confirmar el pedido ${pago.idPedido}: ${resultado.mensaje}`);
            }
        }
    } catch (error) {
        logger.error(`Error al aplicar pago exitoso: ${error.message}`);
    }
};

/**
 * Procesa un webhook entrante de la pasarela
 *
 * @param {object} payload - Datos crudos del webhook
 * @param {string} ipOrigen - IP de origen
 * @returns {Promise<object>} { exito, mensaje }
 */
const procesarWebhook = async (payload, ipOrigen) => {
    const pasarela = obtenerPasarela();
    const handler = new WebhookHandler(pasarela);

    const resultado = handler.procesar(payload, ipOrigen);

    if (!resultado.valido) {
        return { exito: false, mensaje: resultado.mensaje };
    }

    if (!resultado.procesable) {
        return { exito: false, mensaje: resultado.mensaje };
    }

    const info = resultado.datos;

    const pago = await Pago.findOne({
        where: { referencia: info.referencia }
    });

    if (!pago) {
        logger.warn(`Webhook para referencia inexistente: ${info.referencia}`);
        return { exito: false, mensaje: 'Pago no encontrado para la referencia del webhook' };
    }

    await registrarTransaccion({
        idEmpresa: pago.idEmpresa,
        idPago: pago.idPago,
        tipoEvento: 'webhook',
        estadoResultante: info.estado,
        codigoRespuesta: info.codigoRespuesta,
        mensajeRespuesta: info.mensaje,
        referenciaPayu: info.referencia,
        orderIdPayu: info.orderId,
        transactionIdPayu: info.transactionId,
        monto: info.monto,
        datosCompletos: info.datos,
        ipOrigen
    });

    if (!handler.debeAplicarCambio(pago.estado, info.estado)) {
        logger.info(`Webhook ignorado por protección de estado: ${pago.estado} -> ${info.estado}`);
        return { exito: true, mensaje: 'Webhook recibido, sin cambio de estado aplicable' };
    }

    const estadoAnterior = pago.estado;
    pago.estado = info.estado;
    if (info.transactionId) {
        pago.referenciaPayu = info.referencia;
    }
    if (info.estado === 'completado') {
        pago.fechaPago = new Date();
    }
    await pago.save();

    if (info.estado === 'completado' && estadoAnterior !== 'completado') {
        await aplicarPagoExitoso(pago);
    }

    logger.info(`Webhook aplicado: pago ${pago.idPago} ${estadoAnterior} -> ${info.estado}`);

    return { exito: true, mensaje: 'Webhook procesado y pago actualizado correctamente' };
};

/**
 * Consulta el estado actual de un pago directamente en la pasarela
 *
 * @param {string} idPago - Pago a consultar
 * @param {string} idEmpresa - Empresa
 * @returns {Promise<object>} { exito, pago, estadoPasarela }
 */
const consultarEstadoPago = async (idPago, idEmpresa) => {
    const pago = await Pago.findOne({
        where: { idPago, idEmpresa, eliminado: false }
    });

    if (!pago) {
        return { exito: false, mensaje: 'Pago no encontrado' };
    }

    const pasarela = obtenerPasarela();
    const resultado = await pasarela.consultarEstado(pago.referencia);

    await registrarTransaccion({
        idEmpresa,
        idPago: pago.idPago,
        tipoEvento: 'consulta',
        estadoResultante: resultado.estado,
        referenciaPayu: pago.referencia,
        datosCompletos: resultado.datos
    });

    if (resultado.exito && resultado.estado !== pago.estado) {
        const handler = new WebhookHandler(pasarela);
        if (handler.debeAplicarCambio(pago.estado, resultado.estado)) {
            pago.estado = resultado.estado;
            if (resultado.estado === 'completado') {
                pago.fechaPago = new Date();
                await aplicarPagoExitoso(pago);
            }
            await pago.save();
        }
    }

    return {
        exito: true,
        pago: pago.datosCompletos(),
        estadoPasarela: resultado.estado
    };
};

/**
 * Procesa el reembolso de un pago completado
 *
 * @param {string} idPago - Pago a reembolsar
 * @param {string} motivo - Razón del reembolso
 * @param {string} idEmpresa - Empresa
 * @returns {Promise<object>} { exito, mensaje }
 */
const reembolsarPago = async (idPago, motivo, idEmpresa) => {
    const pago = await Pago.findOne({
        where: { idPago, idEmpresa, eliminado: false }
    });

    if (!pago) {
        return { exito: false, mensaje: 'Pago no encontrado' };
    }

    if (!pago.puedeReembolsarse()) {
        return { exito: false, mensaje: `No se puede reembolsar un pago en estado ${pago.estado}` };
    }

    const ultimaTransaccion = await TransaccionPago.findOne({
        where: { idPago: pago.idPago, tipoEvento: 'respuesta' },
        order: [['fecha_creacion', 'DESC']]
    });

    const orderId = ultimaTransaccion ? ultimaTransaccion.orderIdPayu : null;
    const transactionId = ultimaTransaccion ? ultimaTransaccion.transactionIdPayu : null;

    if (!orderId || !transactionId) {
        return { exito: false, mensaje: 'No se encontraron los identificadores de PayU para el reembolso' };
    }

    const pasarela = obtenerPasarela();
    const resultado = await pasarela.procesarReembolso({
        orderId,
        transactionId,
        monto: parseFloat(pago.monto),
        motivo: motivo || 'Reembolso solicitado'
    });

    await registrarTransaccion({
        idEmpresa,
        idPago: pago.idPago,
        tipoEvento: 'reembolso',
        estadoResultante: resultado.exito ? 'reembolso' : pago.estado,
        mensajeRespuesta: resultado.mensaje,
        referenciaPayu: pago.referencia,
        orderIdPayu: orderId,
        transactionIdPayu: transactionId,
        monto: parseFloat(pago.monto),
        datosCompletos: resultado.datos
    });

    if (resultado.exito) {
        pago.estado = 'reembolso';
        await pago.save();
    }

    return {
        exito: resultado.exito,
        mensaje: resultado.exito
            ? 'Reembolso procesado correctamente'
            : `No se pudo procesar el reembolso: ${resultado.mensaje}`
    };
};

/**
 * Obtiene las transacciones de auditoría de un pago
 */
const obtenerTransaccionesPago = async (idPago, idEmpresa) => {
    const pago = await Pago.findOne({
        where: { idPago, idEmpresa, eliminado: false }
    });

    if (!pago) {
        return null;
    }

    const transacciones = await TransaccionPago.findAll({
        where: { idPago, idEmpresa },
        order: [['fecha_creacion', 'ASC']]
    });

    return transacciones.map(t => t.aDatosVista());
};

module.exports = {
    generarReferencia,
    crearPago,
    procesarWebhook,
    consultarEstadoPago,
    reembolsarPago,
    obtenerTransaccionesPago
};