const express = require('express');
const router = express.Router();

const ordenController = require('../controllers/ordenProduccionController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarCrearOrden,
    validarCompletarOrden,
    validarCancelarOrden,
    validarIdOrden
} = require('../middlewares/validators/produccionValidator');

// =====================================================
// CRUD Y LISTADO
// =====================================================
router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('produccion.ver_ordenes'),
    ordenController.listarOrdenes
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('produccion.crear_orden'),
    validarCrearOrden,
    ordenController.crearOrden
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('produccion.ver_ordenes'),
    validarIdOrden,
    ordenController.obtenerOrden
);

router.get(
    '/:id/verificar-materiales',
    verificarAutenticacion,
    verificarPermiso('produccion.ver_ordenes'),
    validarIdOrden,
    ordenController.verificarMateriales
);

// =====================================================
// TRANSICIONES DE ESTADO
// =====================================================
router.patch(
    '/:id/iniciar',
    verificarAutenticacion,
    verificarPermiso('produccion.iniciar_orden'),
    validarIdOrden,
    ordenController.iniciarOrden
);

router.patch(
    '/:id/completar',
    verificarAutenticacion,
    verificarPermiso('produccion.completar_orden'),
    validarCompletarOrden,
    ordenController.completarOrden
);

router.patch(
    '/:id/cancelar',
    verificarAutenticacion,
    verificarPermiso('produccion.cancelar_orden'),
    validarCancelarOrden,
    ordenController.cancelarOrden
);

module.exports = router;