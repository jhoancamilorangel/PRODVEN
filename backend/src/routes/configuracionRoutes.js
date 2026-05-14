const express = require('express');
const router = express.Router();

const configuracionController = require('../controllers/configuracionController');

const {
    verificarAutenticacion
} = require('../middlewares/authMiddleware');

const {
    verificarPermiso
} = require('../middlewares/rbacMiddleware');

const {
    validarConfiguracionCompleta,
    validarColores,
    validarHorarios
} = require('../middlewares/validators/configuracionValidator');

const {
    validarIdEmpresa
} = require('../middlewares/validators/empresaValidator');

// =====================================================
// RUTAS PÚBLICAS (sin autenticación)
// =====================================================

/**
 * GET /api/configuracion/publica/:idEmpresa
 * Configuración pública de cualquier empresa del marketplace
 */
router.get(
    '/publica/:idEmpresa',
    configuracionController.obtenerConfiguracionPublica
);

// =====================================================
// RUTAS PROTEGIDAS (requieren autenticación)
// =====================================================

/**
 * GET /api/configuracion
 * Configuración de la empresa del usuario
 */
router.get(
    '/',
    verificarAutenticacion,
    configuracionController.obtenerConfiguracion
);

/**
 * GET /api/configuracion/factura/proximo-numero
 * Próximo número de factura que se generará
 */
router.get(
    '/factura/proximo-numero',
    verificarAutenticacion,
    configuracionController.obtenerProximoNumeroFactura
);

// =====================================================
// RUTAS DE ACTUALIZACIÓN (Solo Administrador)
// =====================================================

/**
 * PUT /api/configuracion
 * Actualizar configuración completa
 */
router.put(
    '/',
    verificarAutenticacion,
    verificarPermiso('empresa.editar_configuracion'),
    validarConfiguracionCompleta,
    configuracionController.actualizarConfiguracion
);

/**
 * PATCH /api/configuracion/colores
 * Actualizar solo colores corporativos
 */
router.patch(
    '/colores',
    verificarAutenticacion,
    verificarPermiso('empresa.editar_configuracion'),
    validarColores,
    configuracionController.actualizarColores
);

/**
 * PATCH /api/configuracion/horarios
 * Actualizar horarios de atención
 */
router.patch(
    '/horarios',
    verificarAutenticacion,
    verificarPermiso('empresa.editar_configuracion'),
    validarHorarios,
    configuracionController.actualizarHorarios
);

/**
 * PATCH /api/configuracion/metodos-pago
 * Actualizar métodos de pago aceptados
 */
router.patch(
    '/metodos-pago',
    verificarAutenticacion,
    verificarPermiso('empresa.gestionar_metodos_pago'),
    configuracionController.actualizarMetodosPago
);

/**
 * PATCH /api/configuracion/mantenimiento
 * Activar/desactivar modo mantenimiento
 */
router.patch(
    '/mantenimiento',
    verificarAutenticacion,
    verificarPermiso('empresa.editar_configuracion'),
    configuracionController.toggleMantenimiento
);

module.exports = router;