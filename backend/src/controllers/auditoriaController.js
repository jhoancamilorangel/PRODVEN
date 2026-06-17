const auditoriaService = require('../services/private/auditoriaService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * GET /api/auditoria
 * Lista los registros de auditoría de la empresa, con filtros opcionales
 */
const listarAuditoria = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await auditoriaService.listarAuditoria(idEmpresa, {
            entidad: req.query.entidad,
            idEntidad: req.query.idEntidad,
            realizadoPor: req.query.realizadoPor,
            accion: req.query.accion,
            fechaDesde: req.query.fechaDesde,
            fechaHasta: req.query.fechaHasta,
            pagina: req.query.pagina,
            limit: req.query.limit
        });

        return sendResponse(res, 200, true, 'Registros de auditoría', resultado);
    } catch (error) {
        logger.error(`Error al listar auditoría: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/auditoria/entidad/:entidad/:idEntidad
 * Historial de auditoría de un registro específico
 */
const historialEntidad = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        const resultado = await auditoriaService.historialEntidad(
            idEmpresa,
            req.params.entidad,
            req.params.idEntidad
        );

        return sendResponse(res, 200, true, 'Historial de la entidad', resultado);
    } catch (error) {
        logger.error(`Error al obtener historial de entidad: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarAuditoria,
    historialEntidad
};