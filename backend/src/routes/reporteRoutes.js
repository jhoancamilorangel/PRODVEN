const express = require('express');
const router = express.Router();

const reporteController = require('../controllers/reporteController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');

// =====================================================
// RUTAS DE REPORTES
// =====================================================
// Todas son consultas (GET) que leen y resumen datos existentes.
// Cada ruta es específica, así que no hay conflictos de orden.

// Reporte de ventas por período
router.get(
    '/ventas',
    verificarAutenticacion,
    reporteController.ventasPorPeriodo
);

// Productos más vendidos
router.get(
    '/productos-mas-vendidos',
    verificarAutenticacion,
    reporteController.productosMasVendidos
);

// Pedidos por estado
router.get(
    '/pedidos-por-estado',
    verificarAutenticacion,
    reporteController.pedidosPorEstado
);

// Resumen general (dashboard)
router.get(
    '/resumen',
    verificarAutenticacion,
    reporteController.resumenGeneral
);

module.exports = router;