const Suscripcion = require('../models/Suscripcion');
const Empresa = require('../models/Empresa');
const suscripcionService = require('../services/private/suscripcionService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/suscripciones/planes
 * Lista todos los planes disponibles con sus precios y características
 * Acceso: Público (cualquier persona puede ver los planes)
 */
const listarPlanesDisponibles = async (req, res, next) => {
    try {
        const planes = Suscripcion.listarPlanesPublicos();

        return sendResponse(res, 200, true, 'Planes disponibles', { planes });
    } catch (error) {
        logger.error(`Error al listar planes: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/suscripciones
 * Lista todas las suscripciones del sistema (Solo SuperAdmin)
 */
const listarSuscripciones = async (req, res, next) => {
    try {
        const filtros = {
            plan: req.query.plan,
            estado: req.query.estado,
            pagina: req.query.pagina,
            limit: req.query.limit
        };

        const resultado = await suscripcionService.listarTodasLasSuscripciones(filtros);

        return sendResponse(res, 200, true, 'Suscripciones obtenidas', resultado);
    } catch (error) {
        logger.error(`Error al listar suscripciones: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/suscripciones/mi-plan
 * Obtiene el plan actual de la empresa del usuario autenticado
 * Acceso: Administrador, Supervisor o cualquier rol con acceso a su empresa
 */
const obtenerMiPlan = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const suscripcion = await Suscripcion.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!suscripcion) {
            return sendResponse(res, 404, false, 'No tienes una suscripción asociada');
        }

        return sendResponse(res, 200, true, 'Plan actual', {
            ...suscripcion.resumenPlan(),
            esCortesia: suscripcionService.esCortesia(suscripcion)
        });
    } catch (error) {
        logger.error(`Error al obtener mi plan: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/suscripciones/limites
 * Obtiene el uso actual vs límites del plan de la empresa
 * Acceso: Administrador de la empresa
 */
const obtenerLimitesYUso = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const suscripcion = await Suscripcion.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!suscripcion) {
            return sendResponse(res, 404, false, 'No tienes una suscripción asociada');
        }

        const Usuario = require('../models/Usuario');
        const cantidadUsuarios = await Usuario.count({
            where: { idEmpresa: req.tenantId, eliminado: false }
        });

        return sendResponse(res, 200, true, 'Uso actual de límites', {
            plan: suscripcion.plan,
            estado: suscripcion.estado,
            limites: {
                productos: {
                    limite: suscripcion.limiteProductos,
                    usado: 0,
                    disponibles: suscripcion.limiteProductos
                },
                usuarios: {
                    limite: suscripcion.limiteUsuarios,
                    usado: cantidadUsuarios,
                    disponibles: Math.max(0, suscripcion.limiteUsuarios - cantidadUsuarios)
                },
                almacenamiento: {
                    limiteMb: suscripcion.limiteAlmacenamientoMb,
                    usadoMb: 0,
                    disponibleMb: suscripcion.limiteAlmacenamientoMb
                },
                pedidosMensuales: {
                    limite: suscripcion.limitePedidosMensuales,
                    usado: 0,
                    disponibles: suscripcion.limitePedidosMensuales
                }
            }
        });
    } catch (error) {
        logger.error(`Error al obtener límites: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/suscripciones/:id/cambiar-plan
 * Cambia el plan de una empresa (Solo SuperAdmin)
 */
const cambiarPlan = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { plan } = req.body;

        const suscripcion = await Suscripcion.findOne({
            where: { idSuscripcion: id }
        });

        if (!suscripcion) {
            return sendResponse(res, 404, false, 'Suscripción no encontrada');
        }

        const empresa = await Empresa.findByPk(suscripcion.idEmpresa);

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa asociada no encontrada');
        }

        const suscripcionActualizada = await suscripcionService.cambiarPlan(
            empresa.idEmpresa,
            plan,
            req.userId
        );

        return sendResponse(res, 200, true, `Plan actualizado a ${plan} correctamente`,
            suscripcionActualizada.resumenPlan()
        );
    } catch (error) {
        logger.error(`Error al cambiar plan: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/suscripciones/:id/cortesia
 * Otorga acceso de cortesía (gratis, completo, sin vencimiento) a una empresa.
 * Solo SuperAdmin. El :id es el idEmpresa.
 */
const activarCortesia = async (req, res, next) => {
    try {
        const { id } = req.params; // idEmpresa

        const empresa = await Empresa.findByPk(id);
        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const suscripcion = await suscripcionService.activarCortesia(id, req.userId);

        return sendResponse(res, 200, true, 'Acceso de cortesía otorgado. La empresa ahora usa todo gratis.', {
            ...suscripcion.resumenPlan(),
            esCortesia: true
        });
    } catch (error) {
        logger.error(`Error al activar cortesía: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/suscripciones/:id/quitar-cortesia
 * Retira la cortesía: la empresa cae a premium con 30 días de prueba.
 * Solo SuperAdmin. El :id es el idEmpresa.
 */
const quitarCortesia = async (req, res, next) => {
    try {
        const { id } = req.params; // idEmpresa

        const empresa = await Empresa.findByPk(id);
        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const suscripcion = await suscripcionService.quitarCortesia(id, req.userId);

        return sendResponse(res, 200, true, 'Cortesía retirada. La empresa pasa a premium con 30 días de prueba.', {
            ...suscripcion.resumenPlan(),
            esCortesia: false
        });
    } catch (error) {
        logger.error(`Error al quitar cortesía: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/suscripciones/:id/renovar
 * Renueva una suscripción extendiendo su fecha de vencimiento
 * Acceso: Solo SuperAdmin
 */
const renovarSuscripcion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { ciclo } = req.body;

        const suscripcion = await Suscripcion.findOne({
            where: { idSuscripcion: id }
        });

        if (!suscripcion) {
            return sendResponse(res, 404, false, 'Suscripción no encontrada');
        }

        const suscripcionRenovada = await suscripcionService.renovarSuscripcion(
            suscripcion.idEmpresa,
            ciclo || 'mensual'
        );

        return sendResponse(res, 200, true, 'Suscripción renovada correctamente',
            suscripcionRenovada.resumenPlan()
        );
    } catch (error) {
        logger.error(`Error al renovar suscripción: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/suscripciones/:id/suspender
 * Suspende una suscripción (Solo SuperAdmin)
 */
const suspenderSuscripcion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        if (!motivo || motivo.trim().length < 10) {
            return sendResponse(res, 400, false, 'Debes proporcionar un motivo de al menos 10 caracteres');
        }

        const suscripcion = await Suscripcion.findOne({
            where: { idSuscripcion: id }
        });

        if (!suscripcion) {
            return sendResponse(res, 404, false, 'Suscripción no encontrada');
        }

        const suscripcionActualizada = await suscripcionService.suspenderSuscripcion(
            suscripcion.idEmpresa,
            motivo,
            req.userId
        );

        return sendResponse(res, 200, true, 'Suscripción suspendida correctamente',
            suscripcionActualizada.resumenPlan()
        );
    } catch (error) {
        logger.error(`Error al suspender suscripción: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/suscripciones/:id/reactivar
 * Reactiva una suscripción suspendida (Solo SuperAdmin)
 */
const reactivarSuscripcion = async (req, res, next) => {
    try {
        const { id } = req.params;

        const suscripcion = await Suscripcion.findOne({
            where: { idSuscripcion: id }
        });

        if (!suscripcion) {
            return sendResponse(res, 404, false, 'Suscripción no encontrada');
        }

        const suscripcionActualizada = await suscripcionService.reactivarSuscripcion(
            suscripcion.idEmpresa
        );

        return sendResponse(res, 200, true, 'Suscripción reactivada correctamente',
            suscripcionActualizada.resumenPlan()
        );
    } catch (error) {
        logger.error(`Error al reactivar suscripción: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/suscripciones/:id/cancelar
 * Cancela una suscripción
 * Acceso: Administrador de la empresa o SuperAdmin
 */
const cancelarSuscripcion = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { motivoCancelacion } = req.body;

        const suscripcion = await Suscripcion.findOne({
            where: { idSuscripcion: id }
        });

        if (!suscripcion) {
            return sendResponse(res, 404, false, 'Suscripción no encontrada');
        }

        if (!req.esSuperAdmin && req.tenantId !== suscripcion.idEmpresa) {
            return sendResponse(res, 404, false, 'Suscripción no encontrada');
        }

        const suscripcionCancelada = await suscripcionService.cancelarSuscripcion(
            suscripcion.idEmpresa,
            motivoCancelacion,
            req.userId
        );

        return sendResponse(res, 200, true,
            'Suscripción cancelada. Seguirá activa hasta la fecha de vencimiento.',
            suscripcionCancelada.resumenPlan()
        );
    } catch (error) {
        logger.error(`Error al cancelar suscripción: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/suscripciones/estadisticas
 * Obtiene estadísticas globales de suscripciones (Solo SuperAdmin)
 */
const obtenerEstadisticas = async (req, res, next) => {
    try {
        const estadisticas = await suscripcionService.obtenerEstadisticasSuscripciones();

        return sendResponse(res, 200, true, 'Estadísticas de suscripciones', estadisticas);
    } catch (error) {
        logger.error(`Error al obtener estadísticas: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarPlanesDisponibles,
    listarSuscripciones,
    obtenerMiPlan,
    obtenerLimitesYUso,
    cambiarPlan,
    activarCortesia,
    quitarCortesia,
    renovarSuscripcion,
    suspenderSuscripcion,
    reactivarSuscripcion,
    cancelarSuscripcion,
    obtenerEstadisticas
};