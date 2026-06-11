const express = require('express');
const router = express.Router();

const pagoController = require('../controllers/pagoController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarCrearPago,
    validarReembolso,
    validarIdPago
} = require('../middlewares/validators/pagoValidator');

// =====================================================
// CRUD Y OPERACIONES DE PAGO
// =====================================================
router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('pagos.ver'),
    pagoController.listarPagos
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('pagos.procesar'),
    validarCrearPago,
    pagoController.crearPago
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('pagos.ver'),
    validarIdPago,
    pagoController.obtenerPago
);

router.get(
    '/:id/consultar-estado',
    verificarAutenticacion,
    verificarPermiso('pagos.ver'),
    validarIdPago,
    pagoController.consultarEstado
);

router.post(
    '/:id/reembolsar',
    verificarAutenticacion,
    verificarPermiso('pagos.reembolsar'),
    validarReembolso,
    pagoController.reembolsarPago
);

module.exports = router;