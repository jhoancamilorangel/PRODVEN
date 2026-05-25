const Producto = require('../models/Producto');
const ImagenProducto = require('../models/ImagenProducto');
const productoService = require('../services/private/productoService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion,
    sanitizarDatosActualizacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/productos
 * Lista los productos de la empresa con filtros y paginación
 * El precioCosto solo se incluye para Admin y Supervisor
 */
const listarProductos = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.idCategoria) {
            filtros.idCategoria = req.query.idCategoria;
        }

        if (req.query.disponible !== undefined) {
            filtros.disponible = req.query.disponible === 'true';
        }

        if (req.query.busqueda) {
            filtros[Op.or] = [
                { nombre: { [Op.like]: `%${req.query.busqueda}%` } },
                { codigoSku: { [Op.like]: `%${req.query.busqueda}%` } }
            ];
        }

        const { count, rows } = await Producto.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['nombre', 'ASC']]
        });

        const puedeVerCosto = req.userRole === 'administrador'
            || req.userRole === 'supervisor'
            || req.userRole === 'superadmin';

        const productos = rows.map(p => {
            const datos = p.toJSON();
            if (!puedeVerCosto) {
                delete datos.precioCosto;
            }
            return datos;
        });

        return sendResponse(res, 200, true, 'Productos obtenidos', {
            productos,
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar productos: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/productos/:id
 * Obtiene un producto específico con sus imágenes
 */
const obtenerProducto = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const imagenes = await ImagenProducto.findAll({
            where: { idProducto: producto.idProducto, eliminado: false },
            order: [['orden_visualizacion', 'ASC']]
        });

        const puedeVerCosto = req.userRole === 'administrador'
            || req.userRole === 'supervisor'
            || req.userRole === 'superadmin';

        const datos = producto.toJSON();

        if (puedeVerCosto) {
            datos.margen = producto.calcularMargen();
            datos.gananciaUnitaria = producto.calcularGananciaUnitaria();
        } else {
            delete datos.precioCosto;
        }

        datos.imagenes = imagenes.map(img => img.datosPublicos());

        return sendResponse(res, 200, true, 'Producto obtenido', datos);
    } catch (error) {
        logger.error(`Error al obtener producto: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/productos
 * Crea un nuevo producto validando el límite del plan (Solo Admin)
 */
const crearProducto = async (req, res, next) => {
    try {
        const resultado = await productoService.crearProducto(req.body, req.tenantId);

        if (!resultado.exito) {
            return sendResponse(res, 403, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, resultado.producto);
    } catch (error) {
        logger.error(`Error al crear producto: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/productos/:id
 * Actualiza un producto (Solo Admin)
 */
const actualizarProducto = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const datos = sanitizarDatosActualizacion(req.body, [
            'idProducto',
            'codigoSku',
            'slug',
            'calificacionPromedio',
            'totalResenas',
            'totalVendidos'
        ]);

        if (datos.nombre && datos.nombre !== producto.nombre) {
            datos.slug = Producto.generarSlug(datos.nombre);
        }

        const categoriaAnterior = producto.idCategoria;
        await producto.update(datos);

        if (datos.idCategoria && datos.idCategoria !== categoriaAnterior) {
            const categoriaService = require('../services/shared/categoriaService');
            if (categoriaAnterior) {
                await categoriaService.actualizarContadorProductos(categoriaAnterior);
            }
            await categoriaService.actualizarContadorProductos(datos.idCategoria);
        }

        logger.info(`Producto actualizado: ${producto.idProducto}`);

        return sendResponse(res, 200, true, 'Producto actualizado correctamente', producto);
    } catch (error) {
        logger.error(`Error al actualizar producto: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/productos/:id
 * Elimina un producto con todas sus imágenes (Solo Admin)
 */
const eliminarProducto = async (req, res, next) => {
    try {
        const eliminado = await productoService.eliminarProductoCompleto(req.params.id, req.tenantId);

        if (!eliminado) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        return sendResponse(res, 200, true, 'Producto eliminado correctamente');
    } catch (error) {
        logger.error(`Error al eliminar producto: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/productos/:id/publicar
 * Publica o despublica un producto en el marketplace (Solo Admin)
 */
const togglePublicacion = async (req, res, next) => {
    try {
        const { activar } = req.body;

        const resultado = await productoService.togglePublicacion(
            req.params.id,
            req.tenantId,
            activar
        );

        if (!resultado.exito) {
            return sendResponse(res, 403, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, {
            publicado: resultado.producto.publicado
        });
    } catch (error) {
        logger.error(`Error al cambiar publicación: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/productos/:id/destacar
 * Marca o desmarca un producto como destacado (Solo Admin)
 */
const toggleDestacado = async (req, res, next) => {
    try {
        const { activar } = req.body;

        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        producto.destacado = activar;
        await producto.save();

        return sendResponse(res, 200, true,
            activar ? 'Producto destacado' : 'Producto quitado de destacados',
            { destacado: producto.destacado }
        );
    } catch (error) {
        logger.error(`Error al cambiar destacado: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/productos/:id/oferta
 * Activa o desactiva la oferta de un producto (Solo Admin)
 */
const toggleOferta = async (req, res, next) => {
    try {
        const { activar, precioOferta } = req.body;

        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        if (activar) {
            if (!precioOferta || parseFloat(precioOferta) <= 0) {
                return sendResponse(res, 400, false, 'Debes indicar un precio de oferta válido');
            }
            if (parseFloat(precioOferta) >= parseFloat(producto.precioVenta)) {
                return sendResponse(res, 400, false, 'El precio de oferta debe ser menor al precio de venta');
            }
            producto.precioOferta = precioOferta;
        }

        producto.enOferta = activar;
        await producto.save();

        return sendResponse(res, 200, true,
            activar ? 'Oferta activada' : 'Oferta desactivada',
            { enOferta: producto.enOferta, precioOferta: producto.precioOferta }
        );
    } catch (error) {
        logger.error(`Error al cambiar oferta: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/productos/:id/stock
 * Ajusta el stock de un producto (Solo Admin)
 */
const ajustarStock = async (req, res, next) => {
    try {
        const { cantidadStock } = req.body;

        const producto = await productoService.ajustarStock(
            req.params.id,
            cantidadStock,
            req.tenantId
        );

        return sendResponse(res, 200, true, 'Stock ajustado correctamente', {
            cantidadStock: producto.cantidadStock,
            tieneStockBajo: producto.tieneStockBajo()
        });
    } catch (error) {
        logger.error(`Error al ajustar stock: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/productos/publicos
 * Lista productos públicos del marketplace (sin autenticación)
 */
const listarProductosPublicos = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        const paginacion = construirPaginacion(req.query);

        const where = {
            publicado: true,
            activo: true,
            eliminado: false,
            disponible: true
        };

        if (req.query.idEmpresa) {
            where.idEmpresa = req.query.idEmpresa;
        }

        if (req.query.idCategoria) {
            where.idCategoria = req.query.idCategoria;
        }

        if (req.query.busqueda) {
            where[Op.or] = [
                { nombre: { [Op.like]: `%${req.query.busqueda}%` } },
                { descripcionCorta: { [Op.like]: `%${req.query.busqueda}%` } }
            ];
        }

        let orden = [['total_vendidos', 'DESC']];
        if (req.query.orden === 'precio_asc') orden = [['precio_venta', 'ASC']];
        if (req.query.orden === 'precio_desc') orden = [['precio_venta', 'DESC']];
        if (req.query.orden === 'calificacion') orden = [['calificacion_promedio', 'DESC']];

        const { count, rows } = await Producto.findAndCountAll({
            where,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: orden
        });

        const productos = rows.map(p => p.datosPublicos());

        return sendResponse(res, 200, true, 'Productos del marketplace', {
            productos,
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar productos públicos: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/productos/publicos/:id
 * Obtiene un producto público con sus imágenes (sin autenticación)
 */
const obtenerProductoPublico = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: {
                idProducto: req.params.id,
                publicado: true,
                activo: true,
                eliminado: false
            }
        });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado o no disponible');
        }

        const imagenes = await ImagenProducto.findAll({
            where: { idProducto: producto.idProducto, eliminado: false },
            order: [['orden_visualizacion', 'ASC']]
        });

        const datos = producto.datosPublicos();
        datos.imagenes = imagenes.map(img => img.datosPublicos());

        return sendResponse(res, 200, true, 'Producto', datos);
    } catch (error) {
        logger.error(`Error al obtener producto público: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarProductos,
    obtenerProducto,
    crearProducto,
    actualizarProducto,
    eliminarProducto,
    togglePublicacion,
    toggleDestacado,
    toggleOferta,
    ajustarStock,
    listarProductosPublicos,
    obtenerProductoPublico
};