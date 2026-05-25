const express = require('express');
const router = express.Router();

const proveedorController = require('../controllers/proveedorController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarCrearProveedor,
    validarActualizarProveedor,
    validarIdProveedor
} = require('../middlewares/validators/proveedorValidator');

router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('proveedores.ver'),
    proveedorController.listarProveedores
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('proveedores.crear'),
    validarCrearProveedor,
    proveedorController.crearProveedor
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('proveedores.ver'),
    validarIdProveedor,
    proveedorController.obtenerProveedor
);

router.put(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('proveedores.editar'),
    validarIdProveedor,
    validarActualizarProveedor,
    proveedorController.actualizarProveedor
);

router.delete(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('proveedores.eliminar'),
    validarIdProveedor,
    proveedorController.eliminarProveedor
);

router.patch(
    '/:id/toggle-activo',
    verificarAutenticacion,
    verificarPermiso('proveedores.editar'),
    validarIdProveedor,
    proveedorController.toggleActivo
);

module.exports = router;