const express = require('express');
const router = express.Router();

const zonaController = require('../controllers/zonaController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const {
    validarCrearZona,
    validarIdZona
} = require('../middlewares/validators/zonaValidator');

// =====================================================
// RUTAS DE ZONAS DE COBERTURA
// =====================================================
// La gestión de zonas la hace el negocio (admin de la empresa).

// Validar cobertura de una dirección (va antes de /:idZona para evitar choque)
router.get(
    '/validar-cobertura',
    verificarAutenticacion,
    zonaController.validarCobertura
);

// Crear zona
router.post(
    '/',
    verificarAutenticacion,
    validarCrearZona,
    zonaController.crearZona
);

// Listar zonas
router.get(
    '/',
    verificarAutenticacion,
    zonaController.listarZonas
);

// Obtener una zona
router.get(
    '/:idZona',
    verificarAutenticacion,
    validarIdZona,
    zonaController.obtenerZona
);

// Actualizar zona
router.put(
    '/:idZona',
    verificarAutenticacion,
    validarIdZona,
    zonaController.actualizarZona
);

// Desactivar zona
router.delete(
    '/:idZona',
    verificarAutenticacion,
    validarIdZona,
    zonaController.desactivarZona
);

module.exports = router;