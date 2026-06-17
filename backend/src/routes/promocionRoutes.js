const express = require('express');
const router = express.Router();

const promocionController = require('../controllers/promocionController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarCrearPromocion,
    validarValidarPromocion,
    validarIdPromocion
} = require('../middlewares/validators/promocionValidator');

// =====================================================
// RUTAS DE PROMOCIONES
// =====================================================

// Validar un código de promoción (va antes de /:id para evitar choque)
router.post(
    '/validar',
    verificarAutenticacion,
    validarValidarPromocion,
    promocionController.validarPromocion
);

// Crear promoción
router.post(
    '/',
    verificarAutenticacion,
    validarCrearPromocion,
    promocionController.crearPromocion
);

// Listar promociones
router.get(
    '/',
    verificarAutenticacion,
    promocionController.listarPromociones
);

// Obtener una promoción
router.get(
    '/:idPromocion',
    verificarAutenticacion,
    validarIdPromocion,
    promocionController.obtenerPromocion
);

// Actualizar promoción
router.put(
    '/:idPromocion',
    verificarAutenticacion,
    validarIdPromocion,
    promocionController.actualizarPromocion
);

// Desactivar promoción
router.delete(
    '/:idPromocion',
    verificarAutenticacion,
    validarIdPromocion,
    promocionController.desactivarPromocion
);

module.exports = router;