const express = require('express');
const router = express.Router();

const bodegaController = require('../controllers/bodegaController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarCrearBodega,
    validarActualizarBodega,
    validarIdBodega
} = require('../middlewares/validators/inventarioValidator');

router.get(
    '/principal',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    bodegaController.obtenerPrincipal
);

router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    bodegaController.listarBodegas
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('inventario.gestionar_bodegas'),
    validarCrearBodega,
    bodegaController.crearBodega
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('inventario.ver'),
    validarIdBodega,
    bodegaController.obtenerBodega
);

router.put(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('inventario.gestionar_bodegas'),
    validarIdBodega,
    validarActualizarBodega,
    bodegaController.actualizarBodega
);

router.delete(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('inventario.gestionar_bodegas'),
    validarIdBodega,
    bodegaController.eliminarBodega
);

module.exports = router;