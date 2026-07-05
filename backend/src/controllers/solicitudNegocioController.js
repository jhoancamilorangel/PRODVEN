const solicitudNegocioService = require('../services/private/solicitudNegocioService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Controlador de Solicitudes de Negocio (onboarding de vendedores)
 */

/**
 * POST /api/solicitudes-negocio
 * Un cliente autenticado crea su solicitud para convertirse en negocio.
 */
const crearSolicitud = async (req, res, next) => {
    try {
        const resultado = await solicitudNegocioService.crearSolicitud(req.userId, {
            nombreNegocio: req.body.nombreNegocio,
            categoria: req.body.categoria,
            telefono: req.body.telefono,
            ciudad: req.body.ciudad,
            departamento: req.body.departamento,
            descripcion: req.body.descripcion
        });

        if (!resultado.exito) {
            return sendResponse(res, 400, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, {
            solicitud: resultado.solicitud
        });
    } catch (error) {
        logger.error(`Error al crear solicitud de negocio: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/solicitudes-negocio
 * Lista las solicitudes (superadmin). Filtro opcional ?estado=pendiente
 */
const listarSolicitudes = async (req, res, next) => {
    try {
        const resultado = await solicitudNegocioService.listarSolicitudes({
            estado: req.query.estado,
            pagina: req.query.pagina,
            limit: req.query.limit
        });

        return sendResponse(res, 200, true, 'Solicitudes obtenidas', resultado);
    } catch (error) {
        logger.error(`Error al listar solicitudes de negocio: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/solicitudes-negocio/pendientes/contar
 * Devuelve el conteo de solicitudes pendientes (badge del superadmin).
 */
const contarPendientes = async (req, res, next) => {
    try {
        const resultado = await solicitudNegocioService.contarPendientes();
        return sendResponse(res, 200, true, 'Conteo de pendientes', resultado);
    } catch (error) {
        logger.error(`Error al contar solicitudes pendientes: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/solicitudes-negocio/:idSolicitud/aprobar
 * El superadmin aprueba una solicitud: crea la empresa y promueve al usuario.
 */
const aprobarSolicitud = async (req, res, next) => {
    try {
        const resultado = await solicitudNegocioService.aprobarSolicitud(
            req.params.idSolicitud,
            req.userId
        );

        if (!resultado.exito) {
            return sendResponse(res, 400, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, {
            idEmpresa: resultado.idEmpresa
        });
    } catch (error) {
        logger.error(`Error al aprobar solicitud de negocio: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/solicitudes-negocio/:idSolicitud/rechazar
 * El superadmin rechaza una solicitud con un motivo.
 */
const rechazarSolicitud = async (req, res, next) => {
    try {
        const resultado = await solicitudNegocioService.rechazarSolicitud(
            req.params.idSolicitud,
            req.body.motivo,
            req.userId
        );

        if (!resultado.exito) {
            return sendResponse(res, 400, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al rechazar solicitud de negocio: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearSolicitud,
    listarSolicitudes,
    contarPendientes,
    aprobarSolicitud,
    rechazarSolicitud
};