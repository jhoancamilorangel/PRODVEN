const express = require('express');
const router = express.Router();

const ubicacionController = require('../controllers/ubicacionController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarRegistrarUbicacion,
    validarIdPedidoUbicacion
} = require('../middlewares/validators/ubicacionValidator');

// =====================================================
// RUTAS DE DOMICILIARIOS (gestión mínima)
// =====================================================

router.post(
    '/domiciliarios',
    verificarAutenticacion,
    ubicacionController.crearDomiciliario
);

router.get(
    '/domiciliarios',
    verificarAutenticacion,
    ubicacionController.listarDomiciliarios
);

// =====================================================
// RUTAS DE UBICACIÓN GPS DE PEDIDOS
// =====================================================

router.post(
    '/pedidos/:idPedido/ubicacion',
    verificarAutenticacion,
    validarRegistrarUbicacion,
    ubicacionController.registrarUbicacion
);

router.get(
    '/pedidos/:idPedido/ubicacion',
    verificarAutenticacion,
    validarIdPedidoUbicacion,
    ubicacionController.obtenerUltimaUbicacion
);

router.get(
    '/pedidos/:idPedido/recorrido',
    verificarAutenticacion,
    validarIdPedidoUbicacion,
    ubicacionController.obtenerRecorrido
);

module.exports = router;