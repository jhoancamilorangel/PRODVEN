const express = require('express');
const router = express.Router();

const inventarioController = require('../controllers/inventarioController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarRegistrarMovimiento,
    validarAjustePorConteo,
    validarConsultaKardex
} = require('../middlewares/validators/inventarioValidator');

// =====================================================
// MOVIMIENTOS DE INVENTARIO
// =====================================================

router.post(
    '/movimientos',
    verificarAutenticacion,
    verificarPermiso('inventario.ajustar'),
    validarRegistrarMovimiento,
    inventarioController.registrarMovimiento
);

router.post(
    '/ajuste',
    verificarAutenticacion,
    verificarPermiso('inventario.ajustar'),
    validarAjustePorConteo,
    inventarioController.ajustarPorConteo
);

// =====================================================
// KARDEX (historial)
// =====================================================

router.get(
    '/kardex/:idProducto',
    verificarAutenticacion,
    verificarPermiso('inventario.ver_movimientos'),
    validarConsultaKardex,
    inventarioController.obtenerKardex
);

// =====================================================
// CONSULTAS DE STOCK
// =====================================================

router.get(
    '/stock',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    inventarioController.listarStock
);

router.get(
    '/stock-bajo',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    inventarioController.listarStockBajo
);

router.get(
    '/stock/producto/:idProducto',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    inventarioController.obtenerStockProducto
);

// =====================================================
// RESUMEN EJECUTIVO
// =====================================================

router.get(
    '/resumen',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    inventarioController.obtenerResumen
);

module.exports = router;