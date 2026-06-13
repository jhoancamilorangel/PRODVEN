const express = require('express');
const router = express.Router();

const carritoController = require('../controllers/carritoController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarAgregarProducto,
    validarActualizarCantidad,
    validarIdItem
} = require('../middlewares/validators/carritoValidator');

// =====================================================
// RUTAS DEL CARRITO (para el cliente autenticado)
// =====================================================
// El carrito pertenece al usuario autenticado (cliente).
// No requiere permisos RBAC especiales: cualquier usuario autenticado
// tiene su propio carrito. La seguridad está en que cada quien solo
// accede al suyo mediante req.userId.

router.get(
    '/',
    verificarAutenticacion,
    carritoController.obtenerCarrito
);

router.post(
    '/items',
    verificarAutenticacion,
    validarAgregarProducto,
    carritoController.agregarProducto
);

router.put(
    '/items/:idItem',
    verificarAutenticacion,
    validarActualizarCantidad,
    carritoController.actualizarCantidad
);

router.delete(
    '/items/:idItem',
    verificarAutenticacion,
    validarIdItem,
    carritoController.quitarItem
);

router.delete(
    '/',
    verificarAutenticacion,
    carritoController.vaciarCarrito
);

module.exports = router;