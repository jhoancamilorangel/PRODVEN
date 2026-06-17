const express = require('express');
const router = express.Router();

const auditoriaController = require('../controllers/auditoriaController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');

// =====================================================
// RUTAS DE AUDITORÍA
// =====================================================
// Consultas del historial de auditoría. Solo lectura.
// La auditoría se registra internamente desde otros servicios.

// Historial de una entidad específica (va antes de la ruta general)
router.get(
    '/entidad/:entidad/:idEntidad',
    verificarAutenticacion,
    auditoriaController.historialEntidad
);

// Listar auditoría con filtros
router.get(
    '/',
    verificarAutenticacion,
    auditoriaController.listarAuditoria
);

module.exports = router;