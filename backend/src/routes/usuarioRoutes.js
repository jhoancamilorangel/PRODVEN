const express = require('express');
const router = express.Router();

const usuarioController = require('../controllers/usuarioController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarCrearUsuario,
    validarActualizarUsuario,
    validarIdUsuario
} = require('../middlewares/validators/usuarioValidator');

// =====================================================
// RUTAS ESPECÍFICAS (antes de las rutas con :id)
// =====================================================
router.get(
    '/estadisticas/equipo',
    verificarAutenticacion,
    verificarPermiso('usuarios.ver'),
    usuarioController.obtenerEstadisticasEquipo
);

// =====================================================
// CRUD DE USUARIOS
// =====================================================
router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('usuarios.ver'),
    usuarioController.listarUsuarios
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('usuarios.crear'),
    validarCrearUsuario,
    usuarioController.crearUsuario
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('usuarios.ver'),
    validarIdUsuario,
    usuarioController.obtenerUsuario
);

router.put(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('usuarios.editar'),
    validarActualizarUsuario,
    usuarioController.actualizarUsuario
);

router.delete(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('usuarios.eliminar'),
    validarIdUsuario,
    usuarioController.eliminarUsuario
);

// =====================================================
// ACCIONES SOBRE USUARIOS
// =====================================================
router.patch(
    '/:id/activar',
    verificarAutenticacion,
    verificarPermiso('usuarios.editar'),
    validarIdUsuario,
    usuarioController.activarUsuario
);

router.patch(
    '/:id/desactivar',
    verificarAutenticacion,
    verificarPermiso('usuarios.editar'),
    validarIdUsuario,
    usuarioController.desactivarUsuario
);

router.patch(
    '/:id/resetear-password',
    verificarAutenticacion,
    verificarPermiso('usuarios.editar'),
    validarIdUsuario,
    usuarioController.resetearPassword
);

module.exports = router;