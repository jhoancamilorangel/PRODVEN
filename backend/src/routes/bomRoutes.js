const express = require('express');
const router = express.Router();

const bomController = require('../controllers/bomController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarCrearBom,
    validarAgregarComponente,
    validarIdBom,
    validarIdComponente,
    validarIdProductoParam
} = require('../middlewares/validators/produccionValidator');

// =====================================================
// CONSULTAS POR PRODUCTO (antes de rutas con :id)
// =====================================================
router.get(
    '/producto/:idProducto',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarIdProductoParam,
    bomController.obtenerBomPorProducto
);

// =====================================================
// CRUD DE BOM
// =====================================================
router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    bomController.listarBom
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarCrearBom,
    bomController.crearBom
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarIdBom,
    bomController.obtenerBom
);

router.put(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarIdBom,
    bomController.actualizarBom
);

router.delete(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarIdBom,
    bomController.eliminarBom
);

// =====================================================
// ACCIONES SOBRE BOM
// =====================================================
router.patch(
    '/:id/activar',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarIdBom,
    bomController.activarBom
);

router.patch(
    '/:id/recalcular-costos',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarIdBom,
    bomController.recalcularCostos
);

// =====================================================
// COMPONENTES DEL BOM
// =====================================================
router.post(
    '/:id/componentes',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarAgregarComponente,
    bomController.agregarComponente
);

router.delete(
    '/:id/componentes/:idComp',
    verificarAutenticacion,
    verificarPermiso('produccion.gestionar_bom'),
    validarIdComponente,
    bomController.eliminarComponente
);

module.exports = router;