const express = require('express');
const router = express.Router();

const pedidoController = require('../controllers/pedidoController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarCrearPedido,
    validarIdPedido
} = require('../middlewares/validators/pedidoValidator');

// =====================================================
// RUTAS DE PEDIDOS
// =====================================================
// Crear pedido y ver "mis compras" son acciones del cliente autenticado.
// Listar todos los pedidos de la empresa es para vendedores/admins.

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

// Obtener un pedido específico
router.get(
    '/:idPedido',
    verificarAutenticacion,
    validarIdPedido,
    pedidoController.obtenerPedido
);

module.exports = router;