const Proveedor = require('../models/Proveedor');
const proveedorService = require('../services/shared/proveedorService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion,
    sanitizarDatosActualizacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/proveedores
 * Lista los proveedores de la empresa
 */
const listarProveedores = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.activo !== undefined) {
            filtros.activo = req.query.activo === 'true';
        }

        if (req.query.busqueda) {
            filtros[Op.or] = [
                { nombre: { [Op.like]: `%${req.query.busqueda}%` } },
                { nit: { [Op.like]: `%${req.query.busqueda}%` } },
                { nombreContacto: { [Op.like]: `%${req.query.busqueda}%` } }
            ];
        }

        const { count, rows } = await Proveedor.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['nombre', 'ASC']]
        });

        return sendResponse(res, 200, true, 'Proveedores obtenidos', {
            proveedores: rows,
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar proveedores: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/proveedores/:id
 * Obtiene un proveedor específico
 */
const obtenerProveedor = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProveedor: req.params.id,
            eliminado: false
        });

        const proveedor = await Proveedor.findOne({ where: filtros });

        if (!proveedor) {
            return sendResponse(res, 404, false, 'Proveedor no encontrado');
        }

        const productosAsociados = await proveedorService.contarProductosAsociados(proveedor.idProveedor);

        return sendResponse(res, 200, true, 'Proveedor obtenido', {
            proveedor,
            productosAsociados
        });
    } catch (error) {
        logger.error(`Error al obtener proveedor: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/proveedores
 * Crea un nuevo proveedor (Solo Admin)
 */
const crearProveedor = async (req, res, next) => {
    try {
        const proveedor = await proveedorService.crearProveedor(req.body, req.tenantId);

        return sendResponse(res, 201, true, 'Proveedor creado correctamente', proveedor);
    } catch (error) {
        logger.error(`Error al crear proveedor: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/proveedores/:id
 * Actualiza un proveedor (Solo Admin)
 */
const actualizarProveedor = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProveedor: req.params.id,
            eliminado: false
        });

        const proveedor = await Proveedor.findOne({ where: filtros });

        if (!proveedor) {
            return sendResponse(res, 404, false, 'Proveedor no encontrado');
        }

        const datos = sanitizarDatosActualizacion(req.body, ['idProveedor']);
        await proveedor.update(datos);

        logger.info(`Proveedor actualizado: ${proveedor.idProveedor}`);

        return sendResponse(res, 200, true, 'Proveedor actualizado correctamente', proveedor);
    } catch (error) {
        logger.error(`Error al actualizar proveedor: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/proveedores/:id
 * Elimina lógicamente un proveedor (Solo Admin)
 * Los productos asociados quedan sin proveedor pero no se eliminan
 */
const eliminarProveedor = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProveedor: req.params.id,
            eliminado: false
        });

        const proveedor = await Proveedor.findOne({ where: filtros });

        if (!proveedor) {
            return sendResponse(res, 404, false, 'Proveedor no encontrado');
        }

        const desvinculados = await proveedorService.desvincularDeProductos(proveedor.idProveedor);

        proveedor.eliminado = true;
        proveedor.activo = false;
        await proveedor.save();

        logger.info(`Proveedor eliminado: ${proveedor.idProveedor}, ${desvinculados} producto(s) desvinculado(s)`);

        return sendResponse(res, 200, true,
            `Proveedor eliminado correctamente. ${desvinculados} producto(s) quedaron sin proveedor asignado.`
        );
    } catch (error) {
        logger.error(`Error al eliminar proveedor: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/proveedores/:id/toggle-activo
 * Activa o desactiva un proveedor (Solo Admin)
 */
const toggleActivo = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProveedor: req.params.id,
            eliminado: false
        });

        const proveedor = await Proveedor.findOne({ where: filtros });

        if (!proveedor) {
            return sendResponse(res, 404, false, 'Proveedor no encontrado');
        }

        proveedor.activo = !proveedor.activo;
        await proveedor.save();

        logger.info(`Proveedor ${proveedor.idProveedor} ${proveedor.activo ? 'activado' : 'desactivado'}`);

        return sendResponse(res, 200, true,
            `Proveedor ${proveedor.activo ? 'activado' : 'desactivado'} correctamente`,
            { activo: proveedor.activo }
        );
    } catch (error) {
        logger.error(`Error al cambiar estado del proveedor: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarProveedores,
    obtenerProveedor,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor,
    toggleActivo
};