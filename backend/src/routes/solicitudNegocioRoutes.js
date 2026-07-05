const express = require('express');
const router = express.Router();

const solicitudNegocioController = require('../controllers/solicitudNegocioController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarRolEspecifico } = require('../middlewares/rbacMiddleware');

// =====================================================
// RUTAS DE SOLICITUDES DE NEGOCIO (onboarding de vendedores)
// =====================================================

/**
 * POST /api/solicitudes-negocio
 * Un cliente autenticado crea su solicitud para convertirse en negocio.
 * Acceso: cualquier usuario autenticado (el service valida que sea cliente).
 */
router.post(
    '/',
    verificarAutenticacion,
    solicitudNegocioController.crearSolicitud
);

// =====================================================
// RUTAS EXCLUSIVAS DE SUPERADMIN
// =====================================================

/**
 * GET /api/solicitudes-negocio/pendientes/contar
 * Conteo de solicitudes pendientes (badge del panel superadmin).
 * Va ANTES de la ruta raíz para evitar colisión de patrones.
 */
router.get(
    '/pendientes/contar',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    solicitudNegocioController.contarPendientes
);

/**
 * GET /api/solicitudes-negocio
 * Lista todas las solicitudes. Filtro opcional ?estado=pendiente
 */
router.get(
    '/',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    solicitudNegocioController.listarSolicitudes
);

/**
 * PATCH /api/solicitudes-negocio/:idSolicitud/aprobar
 * Aprueba una solicitud: crea la empresa y promueve al usuario.
 */
router.patch(
    '/:idSolicitud/aprobar',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    solicitudNegocioController.aprobarSolicitud
);

/**
 * PATCH /api/solicitudes-negocio/:idSolicitud/rechazar
 * Rechaza una solicitud con un motivo.
 */
router.patch(
    '/:idSolicitud/rechazar',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    solicitudNegocioController.rechazarSolicitud
);

module.exports = router;