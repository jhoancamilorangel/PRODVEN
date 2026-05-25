const express = require('express');
const router = express.Router();

const productoController = require('../controllers/productoController');
const imagenController = require('../controllers/imagenProductoController');
const { verificarAutenticacion } = require('../middlewares/authMiddleware');
const { verificarPermiso } = require('../middlewares/rbacMiddleware');
const upload = require('../config/multer');

const {
    validarCrearProducto,
    validarActualizarProducto,
    validarToggleEstado,
    validarAjustarStock,
    validarIdProducto
} = require('../middlewares/validators/productoValidator');

const {
    verificarArchivoImagen,
    validarIdProductoParam,
    validarIdImagenParam,
    validarOrdenImagenes
} = require('../middlewares/validators/imagenValidator');

// =====================================================
// RUTAS PÚBLICAS (marketplace, sin autenticación)
// =====================================================
router.get(
    '/publicos',
    productoController.listarProductosPublicos
);

router.get(
    '/publicos/:id',
    productoController.obtenerProductoPublico
);

// =====================================================
// RUTAS DE PRODUCTOS (protegidas)
// =====================================================
router.get(
    '/',
    verificarAutenticacion,
    verificarPermiso('productos.ver'),
    productoController.listarProductos
);

router.post(
    '/',
    verificarAutenticacion,
    verificarPermiso('productos.crear'),
    validarCrearProducto,
    productoController.crearProducto
);

router.get(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('productos.ver'),
    validarIdProducto,
    productoController.obtenerProducto
);

router.put(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('productos.editar'),
    validarIdProducto,
    validarActualizarProducto,
    productoController.actualizarProducto
);

router.delete(
    '/:id',
    verificarAutenticacion,
    verificarPermiso('productos.eliminar'),
    validarIdProducto,
    productoController.eliminarProducto
);

router.patch(
    '/:id/publicar',
    verificarAutenticacion,
    verificarPermiso('productos.publicar_marketplace'),
    validarIdProducto,
    validarToggleEstado,
    productoController.togglePublicacion
);

router.patch(
    '/:id/destacar',
    verificarAutenticacion,
    verificarPermiso('productos.editar'),
    validarIdProducto,
    validarToggleEstado,
    productoController.toggleDestacado
);

router.patch(
    '/:id/oferta',
    verificarAutenticacion,
    verificarPermiso('productos.editar'),
    validarIdProducto,
    productoController.toggleOferta
);

router.patch(
    '/:id/stock',
    verificarAutenticacion,
    verificarPermiso('inventario.ajustar'),
    validarIdProducto,
    validarAjustarStock,
    productoController.ajustarStock
);

// =====================================================
// RUTAS DE IMÁGENES (cuelgan del producto)
// =====================================================
router.post(
    '/:id/imagenes',
    verificarAutenticacion,
    verificarPermiso('productos.gestionar_imagenes'),
    validarIdProductoParam,
    upload.single('imagen'),
    verificarArchivoImagen,
    imagenController.subirImagen
);

router.get(
    '/:id/imagenes',
    verificarAutenticacion,
    verificarPermiso('productos.ver'),
    validarIdProductoParam,
    imagenController.listarImagenes
);

router.patch(
    '/:id/imagenes/ordenar',
    verificarAutenticacion,
    verificarPermiso('productos.gestionar_imagenes'),
    validarIdProductoParam,
    validarOrdenImagenes,
    imagenController.ordenarImagenes
);

router.delete(
    '/:id/imagenes/:imagenId',
    verificarAutenticacion,
    verificarPermiso('productos.gestionar_imagenes'),
    validarIdImagenParam,
    imagenController.eliminarImagen
);

router.patch(
    '/:id/imagenes/:imagenId/principal',
    verificarAutenticacion,
    verificarPermiso('productos.gestionar_imagenes'),
    validarIdImagenParam,
    imagenController.marcarPrincipal
);

module.exports = router;