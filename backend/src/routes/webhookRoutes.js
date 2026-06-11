const express = require('express');
const router = express.Router();

const webhookController = require('../controllers/webhookController');

// =====================================================
// WEBHOOKS DE PASARELAS (sin autenticación de usuario)
// =====================================================
// Estos endpoints los invocan los servidores de las pasarelas de pago.
// La seguridad se basa en la validación de la firma, no en tokens.

router.post(
    '/payu',
    webhookController.recibirWebhookPayu
);

module.exports = router;