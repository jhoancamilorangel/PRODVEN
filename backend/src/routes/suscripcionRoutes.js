const express = require('express');
const router = express.Router();

const suscripcionController = require('../controllers/suscripcionController');

const {
    verificarAutenticacion
} = require('../middlewares/authMiddleware');

const {
    verificarRolEspecifico
} = require('../middlewares/rbacMiddleware');

const {
    validarSuscripcion,
    validarCancelarSuscripcion,
    validarIdEmpresa
} = require('../middlewares/validators/empresaValidator');

// =====================================================
// RUTAS PÚBLICAS (sin autenticación)
// =====================================================

/**
 * GET /api/suscripciones/planes
 * Lista los 4 planes disponibles con sus precios
 */
router.get(
    '/planes',
    suscripcionController.listarPlanesDisponibles
);

// =====================================================
// RUTAS PARA USUARIOS DE EMPRESA
// =====================================================

/**
 * GET /api/suscripciones/mi-plan
 * Plan actual de la empresa del usuario
 */
router.get(
    '/mi-plan',
    verificarAutenticacion,
    suscripcionController.obtenerMiPlan
);

/**
 * GET /api/suscripciones/limites
 * Uso actual vs límites del plan
 */
router.get(
    '/limites',
    verificarAutenticacion,
    suscripcionController.obtenerLimitesYUso
);

/**
 * POST /api/suscripciones/:id/cancelar
 * Cancelar suscripción (Admin o SuperAdmin)
 */
router.post(
    '/:id/cancelar',
    verificarAutenticacion,
    validarCancelarSuscripcion,
    suscripcionController.cancelarSuscripcion
);

// =====================================================
// RUTAS EXCLUSIVAS DE SUPERADMIN
// =====================================================

/**
 * GET /api/suscripciones
 * Listar todas las suscripciones del sistema
 */
router.get(
    '/',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    suscripcionController.listarSuscripciones
);

/**
 * GET /api/suscripciones/estadisticas
 * Dashboard de estadísticas de suscripciones
 */
router.get(
    '/estadisticas',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    suscripcionController.obtenerEstadisticas
);

/**
 * PUT /api/suscripciones/:id/cambiar-plan
 * Cambiar plan de una empresa
 */
router.put(
    '/:id/cambiar-plan',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    validarSuscripcion,
    suscripcionController.cambiarPlan
);

/**
 * PATCH /api/suscripciones/:id/renovar
 * Renovar suscripción extendiendo fecha
 */
router.patch(
    '/:id/renovar',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    suscripcionController.renovarSuscripcion
);

/**
 * PATCH /api/suscripciones/:id/suspender
 * Suspender suscripción administrativamente
 */
router.patch(
    '/:id/suspender',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    suscripcionController.suspenderSuscripcion
);

/**
 * PATCH /api/suscripciones/:id/reactivar
 * Reactivar suscripción suspendida
 */
router.patch(
    '/:id/reactivar',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    suscripcionController.reactivarSuscripcion
);

module.exports = router;