const express = require('express');
const router = express.Router();

const resenaController = require('../controllers/resenaController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarCrearResena,
    validarEditarResena,
    validarIdResena,
    validarIdProducto
} = require('../middlewares/validators/resenaValidator');

// =====================================================
// RUTAS DE RESEÑAS
// =====================================================

// Crear una reseña (cliente autenticado)
router.post(
    '/',
    verificarAutenticacion,
    validarCrearResena,
    resenaController.crearResena
);

// Listar mis reseñas (va antes de las rutas con :id dinámico)
router.get(
    '/mis-resenas',
    verificarAutenticacion,
    resenaController.listarMisResenas
);

// Listar reseñas de un producto
router.get(
    '/producto/:idProducto',
    verificarAutenticacion,
    validarIdProducto,
    resenaController.listarResenasProducto
);

// Editar la propia reseña
router.put(
    '/:idResena',
    verificarAutenticacion,
    validarEditarResena,
    resenaController.editarResena
);

// Eliminar la propia reseña
router.delete(
    '/:idResena',
    verificarAutenticacion,
    validarIdResena,
    resenaController.eliminarResena
);

// Moderar una reseña (la empresa la oculta/muestra)
router.patch(
    '/:idResena/visibilidad',
    verificarAutenticacion,
    validarIdResena,
    resenaController.cambiarVisibilidad
);

module.exports = router;