const pagoService = require('../services/private/pagoService');
const logger = require('../config/logger');

/**
 * POST /api/webhooks/payu
 * Recibe las notificaciones de confirmación de PayU
 *
 * Este endpoint NO usa autenticación de usuario porque lo invocan los
 * servidores de PayU, no un cliente logueado. La seguridad se basa en
 * la validación de la firma del webhook dentro del servicio.
 *
 * Debe responder rápido (200) para que PayU no reintente innecesariamente.
 */
const recibirWebhookPayu = async (req, res) => {
    try {
        const payload = req.body;
        const ipOrigen = req.headers['x-forwarded-for'] || req.socket.remoteAddress || null;

        logger.info(`Webhook PayU recibido desde ${ipOrigen}`);

        const resultado = await pagoService.procesarWebhook(payload, ipOrigen);

        if (resultado.exito) {
            return res.status(200).json({ received: true, message: resultado.mensaje });
        }

        // Aún respondemos 200 para webhooks no procesables válidos,
        // para evitar que PayU reintente indefinidamente algo que no cambiará.
        return res.status(200).json({ received: true, message: resultado.mensaje });
    } catch (error) {
        logger.error(`Error al procesar webhook PayU: ${error.message}`);
        // Respondemos 200 incluso ante error para evitar tormentas de reintentos.
        return res.status(200).json({ received: false, message: 'Error procesando webhook' });
    }
};

module.exports = {
    recibirWebhookPayu
};