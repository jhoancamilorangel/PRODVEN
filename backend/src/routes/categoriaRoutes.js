const express = require('express');
const router = express.Router();

const categoriaController = require('../controllers/categoriaController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const {
    validarCrearCategoria,
    validarActualizarCategoria,
    validarIdCategoria
} = require('../middlewares/validators/categoriaValidator');

// =====================================================
// RUTAS PÚBLICAS
// =====================================================
router.get(
    '/publicas/:idEmpresa',
    categoriaController.listarCategoriasPublicas
);

// =====================================================
// RUTAS PROTEGIDAS
// =====================================================
router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('categorias.ver'),
    categoriaController.listarCategorias
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('categorias.crear'),
    validarCrearCategoria,
    categoriaController.crearCategoria
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('categorias.ver'),
    validarIdCategoria,
    categoriaController.obtenerCategoria
);

router.put(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('categorias.editar'),
    validarIdCategoria,
    validarActualizarCategoria,
    categoriaController.actualizarCategoria
);

router.delete(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('categorias.eliminar'),
    validarIdCategoria,
    categoriaController.eliminarCategoria
);

module.exports = router;