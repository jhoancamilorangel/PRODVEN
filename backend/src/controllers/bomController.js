const BillOfMaterials = require('../models/BillOfMaterials');
const bomService = require('../services/private/bomService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * POST /api/bom
 * Crea una nueva versión de BOM (Solo Admin)
 */
const crearBom = async (req, res, next) => {
    try {
        const bom = await bomService.crearBom(req.body, req.tenantId, req.userId);
        return sendResponse(res, 201, true, 'Receta (BOM) creada correctamente', bom.resumen());
    } catch (error) {
        logger.error(`Error al crear BOM: ${error.message}`);
        if (error.message.includes('no encontrado') || error.message.includes('fabricado')) {
            return sendResponse(res, 400, false, error.message);
        }
        next(error);
    }
};

/**
 * GET /api/bom
 * Lista los BOM de la empresa
 */
const listarBom = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.idProducto) {
            filtros.idProducto = req.query.idProducto;
        }

        if (req.query.estado) {
            filtros.estado = req.query.estado;
        }

        if (req.query.esActiva !== undefined) {
            filtros.esActiva = req.query.esActiva === 'true';
        }

        const { count, rows } = await BillOfMaterials.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_creacion', 'DESC']]
        });

        return sendResponse(res, 200, true, 'Recetas obtenidas', {
            recetas: rows.map(b => b.resumen()),
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar BOM: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/bom/:id
 * Obtiene un BOM completo con sus componentes
 */
const obtenerBom = async (req, res, next) => {
    try {
        const resultado = await bomService.obtenerBomCompleto(req.params.id, req.tenantId);

        if (!resultado) {
            return sendResponse(res, 404, false, 'Receta no encontrada');
        }

        return sendResponse(res, 200, true, 'Receta obtenida', resultado);
    } catch (error) {
        logger.error(`Error al obtener BOM: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/bom/producto/:idProducto
 * Obtiene todas las versiones de BOM de un producto
 */
const obtenerBomPorProducto = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.idProducto,
            eliminado: false
        });

        const versiones = await BillOfMaterials.findAll({
            where: filtros,
            order: [['numero_version', 'DESC']]
        });

        return sendResponse(res, 200, true, 'Versiones de receta obtenidas', {
            versiones: versiones.map(b => b.resumen())
        });
    } catch (error) {
        logger.error(`Error al obtener BOM por producto: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/bom/:id
 * Actualiza datos generales de un BOM en borrador (Solo Admin)
 */
const actualizarBom = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idBom: req.params.id,
            eliminado: false
        });

        const bom = await BillOfMaterials.findOne({ where: filtros });

        if (!bom) {
            return sendResponse(res, 404, false, 'Receta no encontrada');
        }

        if (!bom.esEditable()) {
            return sendResponse(res, 409, false, 'Solo se pueden editar recetas en estado borrador');
        }

        const camposPermitidos = [
            'nombreVersion', 'cantidadProduce', 'unidadProduccion',
            'tiempoEstimadoMinutos', 'costoManoObraUnitario', 'costoIndirectoUnitario',
            'descripcion', 'instruccionesFabricacion', 'notasInternas'
        ];

        const datos = {};
        for (const campo of camposPermitidos) {
            if (req.body[campo] !== undefined) {
                datos[campo] = req.body[campo];
            }
        }

        await bom.update(datos);
        bom.recalcularCostoTotal();
        await bom.save();

        return sendResponse(res, 200, true, 'Receta actualizada correctamente', bom.resumen());
    } catch (error) {
        logger.error(`Error al actualizar BOM: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/bom/:id
 * Elimina lógicamente un BOM (Solo Admin)
 */
const eliminarBom = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idBom: req.params.id,
            eliminado: false
        });

        const bom = await BillOfMaterials.findOne({ where: filtros });

        if (!bom) {
            return sendResponse(res, 404, false, 'Receta no encontrada');
        }

        if (bom.esActiva) {
            return sendResponse(res, 409, false, 'No se puede eliminar una receta activa. Activa otra versión primero.');
        }

        bom.eliminado = true;
        bom.esActiva = false;
        await bom.save();

        logger.info(`BOM eliminado: ${bom.idBom}`);

        return sendResponse(res, 200, true, 'Receta eliminada correctamente');
    } catch (error) {
        logger.error(`Error al eliminar BOM: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/bom/:id/componentes
 * Agrega un componente a un BOM (Solo Admin)
 */
const agregarComponente = async (req, res, next) => {
    try {
        const resultado = await bomService.agregarComponente(req.params.id, req.body, req.tenantId);

        return sendResponse(res, 201, true, 'Componente agregado correctamente', {
            componente: resultado.componente.datosCompletos(),
            costoMaterialesUnitario: parseFloat(resultado.bomActualizado.costoMaterialesUnitario),
            costoTotalUnitario: parseFloat(resultado.bomActualizado.costoTotalUnitario)
        });
    } catch (error) {
        logger.error(`Error al agregar componente: ${error.message}`);
        if (error.message.includes('borrador') || error.message.includes('ya existe') || error.message.includes('sí mismo') || error.message.includes('no encontrado')) {
            return sendResponse(res, 400, false, error.message);
        }
        next(error);
    }
};

/**
 * DELETE /api/bom/:id/componentes/:idComp
 * Elimina un componente de un BOM (Solo Admin)
 */
const eliminarComponente = async (req, res, next) => {
    try {
        const bomActualizado = await bomService.eliminarComponente(
            req.params.id,
            req.params.idComp,
            req.tenantId
        );

        return sendResponse(res, 200, true, 'Componente eliminado correctamente', {
            costoMaterialesUnitario: parseFloat(bomActualizado.costoMaterialesUnitario),
            costoTotalUnitario: parseFloat(bomActualizado.costoTotalUnitario)
        });
    } catch (error) {
        logger.error(`Error al eliminar componente: ${error.message}`);
        if (error.message.includes('borrador') || error.message.includes('no encontrado')) {
            return sendResponse(res, 400, false, error.message);
        }
        next(error);
    }
};

/**
 * PATCH /api/bom/:id/activar
 * Activa una versión de BOM (Solo Admin)
 */
const activarBom = async (req, res, next) => {
    try {
        const bom = await bomService.activarBom(req.params.id, req.tenantId, req.userId);

        return sendResponse(res, 200, true, 'Receta activada correctamente', bom.resumen());
    } catch (error) {
        logger.error(`Error al activar BOM: ${error.message}`);
        if (error.message.includes('sin componentes') || error.message.includes('no encontrado')) {
            return sendResponse(res, 400, false, error.message);
        }
        next(error);
    }
};

/**
 * PATCH /api/bom/:id/recalcular-costos
 * Recalcula los costos del BOM con los precios actuales de las materias primas (Solo Admin)
 */
const recalcularCostos = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idBom: req.params.id,
            eliminado: false
        });

        const existe = await BillOfMaterials.findOne({ where: filtros });

        if (!existe) {
            return sendResponse(res, 404, false, 'Receta no encontrada');
        }

        const bomActualizado = await bomService.actualizarCostosConPreciosActuales(req.params.id, req.tenantId);

        return sendResponse(res, 200, true, 'Costos recalculados con precios actuales', bomActualizado.resumen());
    } catch (error) {
        logger.error(`Error al recalcular costos: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearBom,
    listarBom,
    obtenerBom,
    obtenerBomPorProducto,
    actualizarBom,
    eliminarBom,
    agregarComponente,
    eliminarComponente,
    activarBom,
    recalcularCostos
};