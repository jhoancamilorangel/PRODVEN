const express = require('express');
const router = express.Router();

const empresaController = require('../controllers/empresaController');

const {
    verificarAutenticacion,
    verificarAutenticacionOpcional
} = require('../middlewares/authMiddleware');

const {
    verificarPermiso,
    verificarRolEspecifico
} = require('../middlewares/rbacMiddleware');

const {
    validarCrearEmpresa,
    validarActualizarEmpresa,
    validarToggleMarketplace,
    validarIdEmpresa,
    validarListadoEmpresas
} = require('../middlewares/validators/empresaValidator');

// =====================================================
// RUTAS PÚBLICAS (sin autenticación)
// =====================================================

/**
 * GET /api/empresas/publicas
 * Lista empresas del marketplace público
 */
router.get(
    '/publicas',
    validarListadoEmpresas,
    empresaController.listarEmpresasPublicas
);

/**
 * GET /api/empresas/publicas/:id
 * Detalles de una empresa específica del marketplace
 */
router.get(
    '/publicas/:id',
    validarIdEmpresa,
    empresaController.obtenerEmpresaPublica
);

// =====================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =====================================================

/**
 * GET /api/empresas/mi-empresa
 * Datos de la empresa del usuario autenticado
 */
router.get(
    '/mi-empresa',
    verificarAutenticacion,
    empresaController.obtenerMiEmpresa
);

/**
 * PATCH /api/empresas/mi-empresa/marketplace
 * Activa/desactiva el modo público de la empresa propia
 */
router.patch(
    '/mi-empresa/marketplace',
    verificarAutenticacion,
    verificarPermiso('empresa.editar_configuracion'),
    validarToggleMarketplace,
    empresaController.toggleMarketplace
);

// =====================================================
// RUTAS EXCLUSIVAS DE SUPERADMIN
// =====================================================

/**
 * GET /api/empresas/estadisticas/globales
 * Dashboard de estadísticas del sistema
 */
router.get(
    '/estadisticas/globales',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    empresaController.obtenerEstadisticasGlobales
);

/**
 * POST /api/empresas
 * Crear nueva empresa
 */
router.post(
    '/',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    validarCrearEmpresa,
    empresaController.crearEmpresa
);

/**
 * GET /api/empresas
 * Listar todas las empresas
 */
router.get(
    '/',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    validarListadoEmpresas,
    empresaController.listarEmpresas
);

/**
 * PATCH /api/empresas/:id/activar
 * Activar una empresa
 */
router.patch(
    '/:id/activar',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    validarIdEmpresa,
    empresaController.activarEmpresa
);

/**
 * PATCH /api/empresas/:id/desactivar
 * Desactivar una empresa
 */
router.patch(
    '/:id/desactivar',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    validarIdEmpresa,
    empresaController.desactivarEmpresa
);

/**
 * PATCH /api/empresas/:id/suspender
 * Suspender una empresa con motivo
 */
router.patch(
    '/:id/suspender',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    validarIdEmpresa,
    empresaController.suspenderEmpresa
);

/**
 * DELETE /api/empresas/:id
 * Eliminar lógicamente una empresa
 */
router.delete(
    '/:id',
    verificarAutenticacion,
    verificarRolEspecifico('superadmin'),
    validarIdEmpresa,
    empresaController.eliminarEmpresa
);

// =====================================================
// RUTAS COMPARTIDAS (SuperAdmin o Admin de la empresa)
// =====================================================

/**
 * GET /api/empresas/:id
 * Obtener detalles de una empresa específica
 * El controlador valida que el usuario tenga acceso
 */
router.get(
    '/:id',
    verificarAutenticacion,
    validarIdEmpresa,
    empresaController.obtenerEmpresa
);

/**
 * PUT /api/empresas/:id
 * Actualizar datos de una empresa
 * El controlador valida que el usuario tenga acceso
 */
router.put(
    '/:id',
    verificarAutenticacion,
    validarIdEmpresa,
    validarActualizarEmpresa,
    empresaController.actualizarEmpresa
);

module.exports = router;