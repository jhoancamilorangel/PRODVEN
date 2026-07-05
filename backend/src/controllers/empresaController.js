const Empresa = require('../models/Empresa');
const Suscripcion = require('../models/Suscripcion');
const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa');
const empresaService = require('../services/shared/empresaService');
const suscripcionService = require('../services/private/suscripcionService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion,
    sanitizarDatosActualizacion,
    sanitizarRespuesta,
    sanitizarRespuestaMasiva
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * POST /api/empresas
 * Crea una nueva empresa con su suscripción y configuración (Solo SuperAdmin)
 */
const crearEmpresa = async (req, res, next) => {
    try {
        const { plan, ...datosEmpresa } = req.body;

        const empresaExistente = await Empresa.findOne({
            where: { correo: datosEmpresa.correo }
        });

        if (empresaExistente) {
            return sendResponse(res, 409, false, 'Ya existe una empresa registrada con este correo');
        }

        if (datosEmpresa.nit) {
            const nitExistente = await Empresa.findOne({
                where: { nit: datosEmpresa.nit }
            });

            if (nitExistente) {
                return sendResponse(res, 409, false, 'Ya existe una empresa registrada con este NIT');
            }
        }

        const resultado = await empresaService.crearEmpresaCompleta(
            datosEmpresa,
            plan || 'free',
            req.userId
        );

        logger.info(`Empresa creada por SuperAdmin ${req.userId}: ${resultado.empresa.idEmpresa}`);

        return sendResponse(res, 201, true, 'Empresa creada exitosamente', {
            empresa: resultado.empresa,
            suscripcion: resultado.suscripcion.resumenPlan(),
            configuracion: {
                idConfiguracion: resultado.configuracion.idConfiguracion,
                colorPrimario: resultado.configuracion.colorPrimario,
                colorSecundario: resultado.configuracion.colorSecundario,
                moneda: resultado.configuracion.moneda,
                zonaHoraria: resultado.configuracion.zonaHoraria
            }
        });
    } catch (error) {
        logger.error(`Error al crear empresa: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/empresas
 * Lista todas las empresas del sistema con su suscripción (Solo SuperAdmin)
 */
const listarEmpresas = async (req, res, next) => {
    try {
        const { Op } = require('sequelize');
        const paginacion = construirPaginacion(req.query);

        const where = { eliminado: false };

        if (req.query.estado) {
            where.estado = req.query.estado;
        }

        if (req.query.categoria) {
            where.categoria = req.query.categoria;
        }

        if (req.query.busqueda) {
            where[Op.or] = [
                { nombre: { [Op.like]: `%${req.query.busqueda}%` } },
                { correo: { [Op.like]: `%${req.query.busqueda}%` } },
                { nit: { [Op.like]: `%${req.query.busqueda}%` } }
            ];
        }

        const { count, rows } = await Empresa.findAndCountAll({
            where,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_creacion', 'DESC']]
        });

        // Enriquecer cada empresa con su suscripción (id, plan, estado, cortesía)
        const empresas = [];
        for (const empresa of rows) {
            const suscripcion = await Suscripcion.findOne({
                where: { idEmpresa: empresa.idEmpresa }
            });

            empresas.push({
                ...empresa.toJSON(),
                suscripcion: suscripcion
                    ? {
                        idSuscripcion: suscripcion.idSuscripcion,
                        ...suscripcion.resumenPlan(),
                        esCortesia: suscripcionService.esCortesia(suscripcion)
                    }
                    : null
            });
        }

        return sendResponse(res, 200, true, 'Empresas obtenidas', {
            empresas,
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar empresas: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/empresas/:id
 * Obtiene una empresa específica con sus datos relacionados
 * Acceso: SuperAdmin o Administrador de esa empresa
 */
const obtenerEmpresa = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!req.esSuperAdmin && req.tenantId !== id) {
            logger.warn(
                `Intento de acceso cruzado: usuario ${req.userId}
                intentó ver empresa ${id} (su empresa es ${req.tenantId})
            `);
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const resultado = await empresaService.obtenerEmpresaCompleta(id);

        if (!resultado || !resultado.empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        return sendResponse(res, 200, true, 'Empresa obtenida', {
            empresa: resultado.empresa,
            suscripcion: resultado.suscripcion ? resultado.suscripcion.resumenPlan() : null,
            configuracion: resultado.configuracion
        });
    } catch (error) {
        logger.error(`Error al obtener empresa: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/empresas/mi-empresa
 * Obtiene los datos de la empresa del usuario autenticado
 * Acceso: Cualquier usuario autenticado de una empresa
 */
const obtenerMiEmpresa = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const resultado = await empresaService.obtenerEmpresaCompleta(req.tenantId);

        if (!resultado || !resultado.empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const datosLimitados = req.userRole === 'administrador' || req.userRole === 'superadmin'
            ? {
                empresa: resultado.empresa,
                suscripcion: resultado.suscripcion ? resultado.suscripcion.resumenPlan() : null,
                configuracion: resultado.configuracion
            }
            : {
                empresa: resultado.empresa.datosPublicos(),
                suscripcion: null,
                configuracion: resultado.configuracion ? resultado.configuracion.datosPublicos() : null
            };

        return sendResponse(res, 200, true, 'Datos de tu empresa', datosLimitados);
    } catch (error) {
        logger.error(`Error al obtener mi empresa: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/empresas/:id
 * Actualiza los datos de una empresa
 * Acceso: SuperAdmin o Administrador de esa empresa
 */
const actualizarEmpresa = async (req, res, next) => {
    try {
        const { id } = req.params;

        if (!req.esSuperAdmin && req.tenantId !== id) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const empresa = await Empresa.findOne({
            where: { idEmpresa: id, eliminado: false }
        });

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const datosActualizar = sanitizarDatosActualizacion(req.body, [
            'idEmpresa',
            'estado',
            'modoPublico',
            'calificacionPromedio',
            'totalResenas',
            'fechaVerificacion'
        ]);

        if (datosActualizar.correo && datosActualizar.correo !== empresa.correo) {
            const correoExistente = await Empresa.findOne({
                where: { correo: datosActualizar.correo }
            });

            if (correoExistente) {
                return sendResponse(res, 409, false, 'Ya existe una empresa con este correo');
            }
        }

        if (datosActualizar.nit && datosActualizar.nit !== empresa.nit) {
            const nitExistente = await Empresa.findOne({
                where: { nit: datosActualizar.nit }
            });

            if (nitExistente) {
                return sendResponse(res, 409, false, 'Ya existe una empresa con este NIT');
            }
        }

        await empresa.update(datosActualizar);

        logger.info(`Empresa actualizada: ${id} por usuario ${req.userId}`);

        return sendResponse(res, 200, true, 'Empresa actualizada correctamente', empresa);
    } catch (error) {
        logger.error(`Error al actualizar empresa: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/empresas/:id/activar
 * Activa una empresa (Solo SuperAdmin)
 */
const activarEmpresa = async (req, res, next) => {
    try {
        const { id } = req.params;

        const empresa = await Empresa.findOne({
            where: { idEmpresa: id, eliminado: false }
        });

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const empresaActualizada = await empresaService.activarEmpresa(id);

        return sendResponse(res, 200, true, 'Empresa activada correctamente', empresaActualizada);
    } catch (error) {
        logger.error(`Error al activar empresa: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/empresas/:id/desactivar
 * Desactiva una empresa (Solo SuperAdmin)
 */
const desactivarEmpresa = async (req, res, next) => {
    try {
        const { id } = req.params;

        const empresa = await Empresa.findOne({
            where: { idEmpresa: id, eliminado: false }
        });

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const empresaActualizada = await empresaService.desactivarEmpresa(id);

        return sendResponse(res, 200, true, 'Empresa desactivada correctamente', empresaActualizada);
    } catch (error) {
        logger.error(`Error al desactivar empresa: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/empresas/:id/suspender
 * Suspende una empresa por motivo administrativo (Solo SuperAdmin)
 */
const suspenderEmpresa = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { motivo } = req.body;

        if (!motivo || motivo.trim().length < 10) {
            return sendResponse(res, 400, false, 'Debes proporcionar un motivo de al menos 10 caracteres');
        }

        const empresa = await Empresa.findOne({
            where: { idEmpresa: id, eliminado: false }
        });

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        const empresaActualizada = await empresaService.suspenderEmpresa(id, motivo);

        return sendResponse(res, 200, true, 'Empresa suspendida correctamente', empresaActualizada);
    } catch (error) {
        logger.error(`Error al suspender empresa: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/empresas/:id
 * Elimina lógicamente una empresa (Solo SuperAdmin)
 * Es soft delete: los datos no se pierden, solo se marcan como eliminados
 */
const eliminarEmpresa = async (req, res, next) => {
    try {
        const { id } = req.params;

        const empresa = await Empresa.findOne({
            where: { idEmpresa: id, eliminado: false }
        });

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        await empresaService.eliminarEmpresaLogicamente(id);

        logger.warn(`Empresa eliminada lógicamente: ${id} por SuperAdmin ${req.userId}`);

        return sendResponse(res, 200, true, 'Empresa eliminada correctamente');
    } catch (error) {
        logger.error(`Error al eliminar empresa: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/empresas/mi-empresa/marketplace
 * Activa o desactiva el modo público del marketplace
 * Acceso: Solo Administrador de la empresa
 */
const toggleMarketplace = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const { modoPublico } = req.body;

        const resultado = await empresaService.toggleMarketplace(req.tenantId, modoPublico);

        if (!resultado.exito) {
            return sendResponse(res, 403, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, {
            modoPublico: resultado.empresa.modoPublico
        });
    } catch (error) {
        logger.error(`Error al cambiar marketplace: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/empresas/publicas
 * Lista empresas con modo público activo (marketplace)
 * Acceso: Público (sin autenticación)
 */
const listarEmpresasPublicas = async (req, res, next) => {
    try {
        const filtros = {
            categoria: req.query.categoria,
            ciudad: req.query.ciudad,
            busqueda: req.query.busqueda,
            pagina: req.query.pagina,
            limit: req.query.limit
        };

        const resultado = await empresaService.listarEmpresasPublicas(filtros);

        return sendResponse(res, 200, true, 'Empresas del marketplace', resultado);
    } catch (error) {
        logger.error(`Error al listar empresas públicas: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/empresas/publicas/:id
 * Obtiene los datos públicos de una empresa específica del marketplace
 * Acceso: Público (sin autenticación)
 */
const obtenerEmpresaPublica = async (req, res, next) => {
    try {
        const { id } = req.params;

        const empresa = await Empresa.findOne({
            where: {
                idEmpresa: id,
                modoPublico: true,
                estado: 'activa',
                activo: true,
                eliminado: false
            }
        });

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada o no disponible');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa: id }
        });

        return sendResponse(res, 200, true, 'Empresa pública', {
            empresa: empresa.datosPublicos(),
            configuracion: configuracion ? configuracion.datosPublicos() : null
        });
    } catch (error) {
        logger.error(`Error al obtener empresa pública: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/empresas/estadisticas/globales
 * Obtiene estadísticas globales del sistema (Solo SuperAdmin)
 */
const obtenerEstadisticasGlobales = async (req, res, next) => {
    try {
        const totalEmpresas = await Empresa.count({ where: { eliminado: false } });

        const porEstado = await Empresa.findAll({
            attributes: [
                'estado',
                [require('sequelize').fn('COUNT', require('sequelize').col('id_empresa')), 'cantidad']
            ],
            where: { eliminado: false },
            group: ['estado'],
            raw: true
        });

        const empresasPublicas = await Empresa.count({
            where: {
                modoPublico: true,
                estado: 'activa',
                eliminado: false
            }
        });

        const empresasVerificadas = await Empresa.count({
            where: {
                estado: 'activa',
                eliminado: false
            }
        });

        return sendResponse(res, 200, true, 'Estadísticas globales', {
            totalEmpresas,
            empresasPublicas,
            empresasVerificadas,
            porEstado: porEstado.reduce((acc, item) => {
                acc[item.estado] = parseInt(item.cantidad, 10);
                return acc;
            }, {})
        });
    } catch (error) {
        logger.error(`Error al obtener estadísticas: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearEmpresa,
    listarEmpresas,
    obtenerEmpresa,
    obtenerMiEmpresa,
    actualizarEmpresa,
    activarEmpresa,
    desactivarEmpresa,
    suspenderEmpresa,
    eliminarEmpresa,
    toggleMarketplace,
    listarEmpresasPublicas,
    obtenerEmpresaPublica,
    obtenerEstadisticasGlobales
};