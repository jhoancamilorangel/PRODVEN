const express = require('express');
const router = express.Router();

const pedidoController = require('../controllers/pedidoController');
const gestionPedidoController = require('../controllers/gestionPedidoController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarCrearPedido,
    validarIdPedido
} = require('../middlewares/validators/pedidoValidator');
const {
    validarCambioEstado,
    validarCancelar
} = require('../middlewares/validators/gestionPedidoValidator');

// =====================================================
// RUTAS DE PEDIDOS
// =====================================================

// Pedidos del cliente autenticado (sus compras)
router.get(
    '/mis-compras',
    verificarAutenticacion,
    pedidoController.misCompras
);

// Crear un pedido desde el carrito
router.post(
    '/',
    verificarAutenticacion,
    validarCrearPedido,
    pedidoController.crearPedido
);

// Listar pedidos de la empresa
router.get(
    '/',
    verificarAutenticacion,
    pedidoController.listarPedidos
);

// Cambiar estado de un pedido (gestión por el negocio)
router.patch(
    '/:idPedido/estado',
    verificarAutenticacion,
    validarCambioEstado,
    gestionPedidoController.cambiarEstado
);

// Cancelar un pedido (cliente o negocio)
router.post(
    '/:idPedido/cancelar',
    verificarAutenticacion,
    validarCancelar,
    gestionPedidoController.cancelarPedido
);

// Obtener un pedido específico
router.get(
    '/:idPedido',
    verificarAutenticacion,
    validarIdPedido,
    pedidoController.obtenerPedido
);

module.exports = router;