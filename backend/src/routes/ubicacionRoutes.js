const express = require('express');
const router = express.Router();

const ubicacionController = require('../controllers/ubicacionController');
const domiciliarioController = require('../controllers/domiciliarioController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarRegistrarUbicacion,
    validarIdPedidoUbicacion
} = require('../middlewares/validators/ubicacionValidator');

// =====================================================
// RUTAS DE DOMICILIARIOS
// =====================================================

// Crear domiciliario (de Fase 10)
router.post(
    '/domiciliarios',
    verificarAutenticacion,
    ubicacionController.crearDomiciliario
);

// Listar domiciliarios disponibles (debe ir antes de rutas con :id)
router.get(
    '/domiciliarios/disponibles',
    verificarAutenticacion,
    domiciliarioController.listarDisponibles
);

// Listar todos los domiciliarios (de Fase 10)
router.get(
    '/domiciliarios',
    verificarAutenticacion,
    ubicacionController.listarDomiciliarios
);

// Actualizar domiciliario
router.put(
    '/domiciliarios/:idDomiciliario',
    verificarAutenticacion,
    domiciliarioController.actualizarDomiciliario
);

// Cambiar disponibilidad
router.patch(
    '/domiciliarios/:idDomiciliario/disponibilidad',
    verificarAutenticacion,
    domiciliarioController.cambiarDisponibilidad
);

// Desactivar domiciliario
router.delete(
    '/domiciliarios/:idDomiciliario',
    verificarAutenticacion,
    domiciliarioController.desactivarDomiciliario
);

// =====================================================
// ASIGNACIÓN DE DOMICILIARIO A PEDIDO
// =====================================================

router.post(
    '/pedidos/:idPedido/asignar-domiciliario',
    verificarAutenticacion,
    domiciliarioController.asignarDomiciliario
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