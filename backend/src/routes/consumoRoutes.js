const express = require('express');
const router = express.Router();

const consumoController = require('../controllers/consumoController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');

// =====================================================
// RUTAS ESPECÍFICAS (antes de las genéricas)
// =====================================================
router.get(
    '/reporte-mes',
    verificarAutenticacion,
    verificarPermiso('reportes.ver_produccion'),
    consumoController.reporteMensual
);

router.get(
    '/orden/:idOrden',
    verificarAutenticacion,
    verificarPermiso('produccion.ver_ordenes'),
    consumoController.obtenerConsumosPorOrden
);

router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('reportes.ver_produccion'),
    consumoController.listarConsumos
);

module.exports = router;