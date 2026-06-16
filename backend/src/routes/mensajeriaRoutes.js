const express = require('express');
const router = express.Router();

const mensajeriaController = require('../controllers/mensajeriaController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarCrearConversacion,
    validarEnviarMensaje,
    validarIdConversacion
} = require('../middlewares/validators/mensajeriaValidator');

// =====================================================
// RUTAS DE MENSAJERÍA
// =====================================================
// Todas requieren autenticación. La seguridad fina (ser participante)
// la valida el servicio en cada operación.

// Crear conversación
router.post(
    '/',
    verificarAutenticacion,
    validarCrearConversacion,
    mensajeriaController.crearConversacion
);

// Listar mis conversaciones
router.get(
    '/',
    verificarAutenticacion,
    mensajeriaController.listarConversaciones
);

// Obtener una conversación con sus participantes
router.get(
    '/:idConversacion',
    verificarAutenticacion,
    validarIdConversacion,
    mensajeriaController.obtenerConversacion
);

// Enviar un mensaje en una conversación
router.post(
    '/:idConversacion/mensajes',
    verificarAutenticacion,
    validarEnviarMensaje,
    mensajeriaController.enviarMensaje
);

// Listar los mensajes de una conversación
router.get(
    '/:idConversacion/mensajes',
    verificarAutenticacion,
    validarIdConversacion,
    mensajeriaController.listarMensajes
);

// Marcar como leídos los mensajes de la conversación
router.patch(
    '/:idConversacion/leer',
    verificarAutenticacion,
    validarIdConversacion,
    mensajeriaController.marcarLeidos
);

module.exports = router;