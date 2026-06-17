const express = require('express');
const router = express.Router();

const notificacionController = require('../controllers/notificacionController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { validarIdNotificacion } = require('../middlewares/validators/notificacionValidator');

// =====================================================
// RUTAS DE NOTIFICACIONES
// =====================================================
// Todas operan sobre el usuario autenticado (req.userId).

// Contar no leídas (va antes de las dinámicas)
router.get(
    '/no-leidas',
    verificarAutenticacion,
    notificacionController.contarNoLeidas
);

// Marcar todas como leídas (ruta específica, antes de las dinámicas)
router.patch(
    '/leer-todas',
    verificarAutenticacion,
    notificacionController.marcarTodasLeidas
);

// Listar mis notificaciones
router.get(
    '/',
    verificarAutenticacion,
    notificacionController.listarNotificaciones
);

// Marcar una notificación como leída
router.patch(
    '/:idNotificacion/leer',
    verificarAutenticacion,
    validarIdNotificacion,
    notificacionController.marcarLeida
);

module.exports = router;