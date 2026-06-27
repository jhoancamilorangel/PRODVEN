const express = require('express');
const router = express.Router();

const invArticuloController = require('../../controllers/inventario/invArticuloController');
const invInventarioController = require('../../controllers/inventario/invInventarioController');
const invCategoriaController = require('../../controllers/inventario/invCategoriaController');
const invProveedorController = require('../../controllers/inventario/invProveedorController');
const invBodegaController = require('../../controllers/inventario/invBodegaController');
const invLoteController = require('../../controllers/inventario/invLoteController');
const { verificarAutenticacion } = require('../../middlewares/authMiddleware');
const {
    validarCrearCategoria,
    validarActualizarCategoria,
    validarCrearProveedor,
    validarActualizarProveedor
} = require('../../middlewares/validators/inventario/invCatalogoValidator');
const {
    validarCrearBodega,
    validarActualizarBodega,
    validarTransferencia
} = require('../../middlewares/validators/inventario/invBodegaValidator');
const {
    validarCrearLote,
    validarActualizarLote
} = require('../../middlewares/validators/inventario/invLoteValidator');

// =====================================================
// CONTROL DE INVENTARIO INTERNO
// Todas las rutas requieren autenticación.
// El tenant (idEmpresa) se inyecta desde el token.
// =====================================================

// ----- RESUMEN -----
router.get('/resumen', verificarAutenticacion, invInventarioController.obtenerResumen);

// ----- STOCK BAJO -----
router.get('/stock-bajo', verificarAutenticacion, invArticuloController.listarStockBajo);

// ----- MOVIMIENTOS Y AJUSTES -----
router.post('/movimientos', verificarAutenticacion, invInventarioController.registrarMovimiento);
router.post('/ajuste', verificarAutenticacion, invInventarioController.ajustarPorConteo);

// ----- TRANSFERENCIAS -----
router.post('/transferencias', verificarAutenticacion, validarTransferencia, invInventarioController.transferir);

// ----- KARDEX -----
router.get('/kardex/:idArticulo', verificarAutenticacion, invInventarioController.obtenerKardex);

// ----- CATEGORÍAS -----
router.get('/categorias', verificarAutenticacion, invCategoriaController.listarCategorias);
router.post('/categorias', verificarAutenticacion, validarCrearCategoria, invCategoriaController.crearCategoria);
router.get('/categorias/:id', verificarAutenticacion, invCategoriaController.obtenerCategoria);
router.put('/categorias/:id', verificarAutenticacion, validarActualizarCategoria, invCategoriaController.actualizarCategoria);
router.delete('/categorias/:id', verificarAutenticacion, invCategoriaController.eliminarCategoria);

// ----- PROVEEDORES -----
router.get('/proveedores', verificarAutenticacion, invProveedorController.listarProveedores);
router.post('/proveedores', verificarAutenticacion, validarCrearProveedor, invProveedorController.crearProveedor);
router.get('/proveedores/:id', verificarAutenticacion, invProveedorController.obtenerProveedor);
router.put('/proveedores/:id', verificarAutenticacion, validarActualizarProveedor, invProveedorController.actualizarProveedor);
router.delete('/proveedores/:id', verificarAutenticacion, invProveedorController.eliminarProveedor);

// ----- BODEGAS -----
router.get('/bodegas', verificarAutenticacion, invBodegaController.listarBodegas);
router.post('/bodegas', verificarAutenticacion, validarCrearBodega, invBodegaController.crearBodega);
router.get('/bodegas/:id', verificarAutenticacion, invBodegaController.obtenerBodega);
router.put('/bodegas/:id', verificarAutenticacion, validarActualizarBodega, invBodegaController.actualizarBodega);
router.delete('/bodegas/:id', verificarAutenticacion, invBodegaController.eliminarBodega);

// ----- LOTES -----
router.get('/lotes/articulo/:idArticulo', verificarAutenticacion, invLoteController.listarLotesPorArticulo);
router.post('/lotes', verificarAutenticacion, validarCrearLote, invLoteController.crearLote);
router.put('/lotes/:id', verificarAutenticacion, validarActualizarLote, invLoteController.actualizarLote);
router.delete('/lotes/:id', verificarAutenticacion, invLoteController.eliminarLote);

// ----- ARTÍCULOS -----
router.get('/articulos', verificarAutenticacion, invArticuloController.listarArticulos);
router.post('/articulos', verificarAutenticacion, invArticuloController.crearArticulo);
router.get('/articulos/:id', verificarAutenticacion, invArticuloController.obtenerArticulo);
router.put('/articulos/:id', verificarAutenticacion, invArticuloController.actualizarArticulo);
router.delete('/articulos/:id', verificarAutenticacion, invArticuloController.eliminarArticulo);

module.exports = router;