const Categoria = require('../models/Categoria');
const categoriaService = require('../services/shared/categoriaService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion,
    sanitizarDatosActualizacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/categorias
 * Lista las categorías de la empresa del usuario
 */
const listarCategorias = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.activo !== undefined) {
            filtros.activo = req.query.activo === 'true';
        }

        const { count, rows } = await Categoria.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['orden_visualizacion', 'ASC'], ['nombre', 'ASC']]
        });

        return sendResponse(res, 200, true, 'Categorías obtenidas', {
            categorias: rows,
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar categorías: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/categorias/:id
 * Obtiene una categoría específica
 */
const obtenerCategoria = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idCategoria: req.params.id,
            eliminado: false
        });

        const categoria = await Categoria.findOne({ where: filtros });

        if (!categoria) {
            return sendResponse(res, 404, false, 'Categoría no encontrada');
        }

        return sendResponse(res, 200, true, 'Categoría obtenida', categoria);
    } catch (error) {
        logger.error(`Error al obtener categoría: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/categorias
 * Crea una nueva categoría (Solo Admin)
 */
const crearCategoria = async (req, res, next) => {
    try {
        const categoria = await categoriaService.crearCategoria(req.body, req.tenantId);

        return sendResponse(res, 201, true, 'Categoría creada correctamente', categoria);
    } catch (error) {
        logger.error(`Error al crear categoría: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/categorias/:id
 * Actualiza una categoría (Solo Admin)
 */
const actualizarCategoria = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idCategoria: req.params.id,
            eliminado: false
        });

        const categoria = await Categoria.findOne({ where: filtros });

        if (!categoria) {
            return sendResponse(res, 404, false, 'Categoría no encontrada');
        }

        const datos = sanitizarDatosActualizacion(req.body, ['idCategoria', 'slug', 'totalProductos']);

        if (datos.nombre && datos.nombre !== categoria.nombre) {
            datos.slug = await categoriaService.generarSlugUnico(
                datos.nombre,
                req.tenantId,
                categoria.idCategoria
            );
        }

        await categoria.update(datos);

        logger.info(`Categoría actualizada: ${categoria.idCategoria}`);

        return sendResponse(res, 200, true, 'Categoría actualizada correctamente', categoria);
    } catch (error) {
        logger.error(`Error al actualizar categoría: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/categorias/:id
 * Elimina lógicamente una categoría (Solo Admin)
 */
const eliminarCategoria = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idCategoria: req.params.id,
            eliminado: false
        });

        const categoria = await Categoria.findOne({ where: filtros });

        if (!categoria) {
            return sendResponse(res, 404, false, 'Categoría no encontrada');
        }

        const productosAsociados = await categoriaService.contarProductosAsociados(categoria.idCategoria);

        if (productosAsociados > 0) {
            return sendResponse(res, 409, false,
                `No se puede eliminar. La categoría tiene ${productosAsociados} producto(s) asociado(s). Reasígnalos primero.`
            );
        }

        categoria.eliminado = true;
        categoria.activo = false;
        await categoria.save();

        logger.info(`Categoría eliminada: ${categoria.idCategoria}`);

        return sendResponse(res, 200, true, 'Categoría eliminada correctamente');
    } catch (error) {
        logger.error(`Error al eliminar categoría: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/categorias/publicas/:idEmpresa
 * Lista categorías públicas de una empresa (sin autenticación)
 */
const listarCategoriasPublicas = async (req, res, next) => {
    try {
        const categorias = await Categoria.findAll({
            where: {
                idEmpresa: req.params.idEmpresa,
                activo: true,
                eliminado: false,
                visibleEnMarketplace: true
            },
            order: [['orden_visualizacion', 'ASC'], ['nombre', 'ASC']]
        });

        return sendResponse(res, 200, true, 'Categorías públicas', {
            categorias: categorias.map(c => c.datosPublicos())
        });
    } catch (error) {
        logger.error(`Error al listar categorías públicas: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    listarCategoriasPublicas
};