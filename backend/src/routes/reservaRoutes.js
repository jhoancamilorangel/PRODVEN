const express = require('express');
const router = express.Router();

const reservaController = require('../controllers/reservaController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso, verificarRolEspecifico } = require('../middlewares/rbacMiddleware');
const {
    validarCrearReserva,
    validarIdReserva,
    validarLiberarReserva
} = require('../middlewares/validators/inventarioValidator');

router.post(
    '/procesar-expiradas',
    verificarAutenticacion,
    verificarRolEspecifico('administrador'),
    reservaController.procesarExpiradas
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('inventario.ajustar'),
    validarCrearReserva,
    reservaController.crearReserva
);

router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    reservaController.listarReservas
);

router.get(
    '/activas/:idProducto',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    reservaController.listarReservasActivasProducto
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    validarIdReserva,
    reservaController.obtenerReserva
);

router.patch(
    '/:id/confirmar',
    verificarAutenticacion,
    verificarPermiso('inventario.ajustar'),
    validarIdReserva,
    reservaController.confirmarReserva
);

router.patch(
    '/:id/liberar',
    verificarAutenticacion,
    verificarPermiso('inventario.ajustar'),
    validarLiberarReserva,
    reservaController.liberarReserva
);

module.exports = router;