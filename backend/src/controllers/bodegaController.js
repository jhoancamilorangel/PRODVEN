const Bodega = require('../models/Bodega');
const inventarioService = require('../services/private/inventarioService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion,
    sanitizarDatosActualizacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/bodegas
 * Lista las bodegas de la empresa
 */
const listarBodegas = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.activo !== undefined) {
            filtros.activo = req.query.activo === 'true';
        }

        const { count, rows } = await Bodega.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['es_principal', 'DESC'], ['nombre', 'ASC']]
        });

        return sendResponse(res, 200, true, 'Bodegas obtenidas', {
            bodegas: rows,
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar bodegas: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/bodegas/principal
 * Obtiene la bodega principal de la empresa
 */
const obtenerPrincipal = async (req, res, next) => {
    try {
        const bodega = await inventarioService.obtenerBodegaPrincipal(req.tenantId);

        if (!bodega) {
            return sendResponse(res, 404, false, 'La empresa no tiene bodega principal configurada');
        }

        return sendResponse(res, 200, true, 'Bodega principal', bodega);
    } catch (error) {
        logger.error(`Error al obtener bodega principal: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/bodegas/:id
 * Obtiene una bodega específica
 */
const obtenerBodega = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idBodega: req.params.id,
            eliminado: false
        });

        const bodega = await Bodega.findOne({ where: filtros });

        if (!bodega) {
            return sendResponse(res, 404, false, 'Bodega no encontrada');
        }

        return sendResponse(res, 200, true, 'Bodega obtenida', bodega);
    } catch (error) {
        logger.error(`Error al obtener bodega: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/bodegas
 * Crea una nueva bodega (Solo Admin)
 */
const crearBodega = async (req, res, next) => {
    try {
        const datos = {
            ...req.body,
            idEmpresa: req.tenantId,
            esPrincipal: false
        };

        if (datos.codigo) {
            const existente = await Bodega.findOne({
                where: {
                    idEmpresa: req.tenantId,
                    codigo: datos.codigo,
                    eliminado: false
                }
            });

            if (existente) {
                return sendResponse(res, 409, false, `Ya existe una bodega con el código "${datos.codigo}"`);
            }
        }

        const bodega = await Bodega.create(datos);

        logger.info(`Bodega creada: ${bodega.idBodega} para empresa ${req.tenantId}`);

        return sendResponse(res, 201, true, 'Bodega creada correctamente', bodega);
    } catch (error) {
        logger.error(`Error al crear bodega: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/bodegas/:id
 * Actualiza una bodega (Solo Admin)
 */
const actualizarBodega = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idBodega: req.params.id,
            eliminado: false
        });

        const bodega = await Bodega.findOne({ where: filtros });

        if (!bodega) {
            return sendResponse(res, 404, false, 'Bodega no encontrada');
        }

        const datos = sanitizarDatosActualizacion(req.body, ['idBodega', 'esPrincipal']);

        if (datos.codigo && datos.codigo !== bodega.codigo) {
            const { Op } = require('sequelize');
            const existente = await Bodega.findOne({
                where: {
                    idEmpresa: req.tenantId,
                    codigo: datos.codigo,
                    eliminado: false,
                    idBodega: { [Op.ne]: bodega.idBodega }
                }
            });

            if (existente) {
                return sendResponse(res, 409, false, `Ya existe otra bodega con el código "${datos.codigo}"`);
            }
        }

        await bodega.update(datos);

        return sendResponse(res, 200, true, 'Bodega actualizada correctamente', bodega);
    } catch (error) {
        logger.error(`Error al actualizar bodega: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/bodegas/:id
 * Elimina lógicamente una bodega (Solo Admin)
 * No se puede eliminar la bodega principal ni una con stock
 */
const eliminarBodega = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idBodega: req.params.id,
            eliminado: false
        });

        const bodega = await Bodega.findOne({ where: filtros });

        if (!bodega) {
            return sendResponse(res, 404, false, 'Bodega no encontrada');
        }

        if (bodega.esPrincipal) {
            return sendResponse(res, 409, false, 'No se puede eliminar la bodega principal');
        }

        const StockProducto = require('../models/StockProducto');
        const tieneStock = await StockProducto.findOne({
            where: { idBodega: bodega.idBodega }
        });

        if (tieneStock && parseFloat(tieneStock.cantidadFisica) > 0) {
            return sendResponse(res, 409, false,
                'No se puede eliminar una bodega con stock. Transfiere o ajusta el inventario primero.'
            );
        }

        bodega.eliminado = true;
        bodega.activo = false;
        await bodega.save();

        logger.info(`Bodega eliminada: ${bodega.idBodega}`);

        return sendResponse(res, 200, true, 'Bodega eliminada correctamente');
    } catch (error) {
        logger.error(`Error al eliminar bodega: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarBodegas,
    obtenerPrincipal,
    obtenerBodega,
    crearBodega,
    actualizarBodega,
    eliminarBodega
};