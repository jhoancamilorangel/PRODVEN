const RegistroAuditoria = require('../../models/RegistroAuditoria');
const LogActividad = require('../../models/LogActividad');
const logger = require('../../config/logger');
const { Op } = require('sequelize');

/**
 * Servicio de Auditoría
 *
 * Dos capacidades:
 *  1. Auditoría de datos (registros_auditoria): registra cambios en entidades
 *     concretas, con valor anterior y nuevo. Es la trazabilidad formal.
 *  2. Log de actividad (logs_actividad): registra acciones generales del
 *     usuario (login, exportaciones, etc.).
 *
 * PRINCIPIO CLAVE: la auditoría NUNCA debe romper la operación principal.
 * Si registrar falla, se loguea el error pero no se propaga, para no
 * deshacer la acción real que se estaba auditando.
 */

// =====================================================
// REGISTRAR AUDITORÍA DE DATOS (uso interno)
// =====================================================

/**
 * Registra un cambio en una entidad (la función central de auditoría).
 *
 * Pensada para ser llamada por otros servicios cuando ocurre una acción
 * importante sobre un dato (crear, actualizar, eliminar).
 *
 * @param {object} datos - {
 *   idEmpresa, entidad, idEntidad, accion ('INSERT'|'UPDATE'|'DELETE'),
 *   valorAnterior, valorNuevo, realizadoPor, ip
 * }
 * @returns {Promise<object|null>} El registro creado, o null si falló
 */
const registrarAuditoria = async (datos) => {
    try {
        const registro = await RegistroAuditoria.create({
            idEmpresa: datos.idEmpresa || null,
            entidad: datos.entidad,
            idEntidad: datos.idEntidad,
            accion: datos.accion,
            valorAnterior: datos.valorAnterior || null,
            valorNuevo: datos.valorNuevo || null,
            realizadoPor: datos.realizadoPor || null,
            ip: datos.ip || null
        });

        logger.info(`Auditoría registrada: ${datos.accion} en ${datos.entidad}/${datos.idEntidad} por ${datos.realizadoPor || 'sistema'}`);

        return registro.datosCompletos();
    } catch (error) {
        // La auditoría no debe tumbar la operación principal
        logger.error(`Error al registrar auditoría: ${error.message}`);
        return null;
    }
};

// =====================================================
// REGISTRAR ACTIVIDAD GENERAL (uso interno)
// =====================================================

/**
 * Registra una actividad general del usuario (login, exportación, etc.)
 */
const registrarActividad = async (datos) => {
    try {
        const log = await LogActividad.create({
            idUsuario: datos.idUsuario || null,
            idEmpresa: datos.idEmpresa || null,
            accion: datos.accion,
            descripcion: datos.descripcion || null,
            ip: datos.ip || null,
            dispositivo: datos.dispositivo || null,
            datosExtra: datos.datosExtra || null
        });

        return log.datosCompletos();
    } catch (error) {
        logger.error(`Error al registrar actividad: ${error.message}`);
        return null;
    }
};

// =====================================================
// CONSULTAR AUDITORÍA
// =====================================================

/**
 * Lista los registros de auditoría de una empresa, con filtros opcionales
 *
 * @param {string} idEmpresa
 * @param {object} filtros - { entidad, idEntidad, realizadoPor, accion, fechaDesde, fechaHasta, pagina, limit }
 */
const listarAuditoria = async (idEmpresa, filtros = {}) => {
    const where = { idEmpresa };

    if (filtros.entidad) where.entidad = filtros.entidad;
    if (filtros.idEntidad) where.idEntidad = filtros.idEntidad;
    if (filtros.realizadoPor) where.realizadoPor = filtros.realizadoPor;
    if (filtros.accion) where.accion = filtros.accion;

    if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fechaAccion = {};
        if (filtros.fechaDesde) where.fechaAccion[Op.gte] = new Date(filtros.fechaDesde);
        if (filtros.fechaHasta) where.fechaAccion[Op.lte] = new Date(filtros.fechaHasta);
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 50;
    const offset = (pagina - 1) * limit;

    const { count, rows } = await RegistroAuditoria.findAndCountAll({
        where,
        order: [['fecha_accion', 'DESC']],
        limit,
        offset
    });

    return {
        registros: rows.map(r => r.datosCompletos()),
        paginacion: {
            total: count,
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

/**
 * Obtiene el historial de auditoría de una entidad específica
 * (ej: todo lo que le pasó al producto X)
 */
const historialEntidad = async (idEmpresa, entidad, idEntidad) => {
    const registros = await RegistroAuditoria.findAll({
        where: { idEmpresa, entidad, idEntidad },
        order: [['fecha_accion', 'DESC']]
    });

    return { registros: registros.map(r => r.datosCompletos()) };
};

module.exports = {
    registrarAuditoria,
    registrarActividad,
    listarAuditoria,
    historialEntidad
};