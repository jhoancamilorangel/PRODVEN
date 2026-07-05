const Suscripcion = require('../../models/Suscripcion');
const Empresa = require('../../models/Empresa');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Suscripciones (Privado - solo administración interna)
 *
 * Maneja toda la lógica relacionada con cambios de plan, renovaciones,
 * suspensiones por impago, cancelaciones y cortesías (acceso gratis).
 *
 * Este servicio está en /private porque solo lo usa el SuperAdmin
 * y los procesos automáticos del sistema (jobs de renovación, etc.)
 */

// Fecha "sin vencimiento" para cortesías permanentes (año 2099)
const FECHA_CORTESIA_FIN = new Date('2099-12-31T23:59:59Z');
const MARCA_CORTESIA = 'CORTESIA';

/**
 * Cambia el plan de una empresa
 *
 * Actualiza la suscripción con los nuevos límites y funcionalidades.
 * NO toca la fecha fin (el cambio aplica para el período actual).
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} nuevoPlan - 'free', 'basico', 'premium', 'enterprise'
 * @param {string} idEjecutor - ID del SuperAdmin que ejecuta el cambio
 * @returns {Promise<Suscripcion>} Suscripción actualizada
 */
const cambiarPlan = async (idEmpresa, nuevoPlan, idEjecutor = null) => {
    const transaction = await sequelize.transaction();

    try {
        const suscripcion = await Suscripcion.findOne({
            where: { idEmpresa },
            transaction
        });

        if (!suscripcion) {
            throw new Error('La empresa no tiene una suscripción registrada');
        }

        const configPlan = Suscripcion.obtenerConfiguracionPlan(nuevoPlan);

        if (!configPlan) {
            throw new Error(`Plan inválido: ${nuevoPlan}`);
        }

        const planAnterior = suscripcion.plan;

        suscripcion.plan = nuevoPlan;
        suscripcion.precioMensual = configPlan.precioMensual;
        suscripcion.limiteProductos = configPlan.limites.productos;
        suscripcion.limiteUsuarios = configPlan.limites.usuarios;
        suscripcion.limiteAlmacenamientoMb = configPlan.limites.almacenamientoMb;
        suscripcion.limitePedidosMensuales = configPlan.limites.pedidosMensuales;
        suscripcion.permiteMarketplace = configPlan.funcionalidades.permiteMarketplace;
        suscripcion.permiteReportesAvanzados = configPlan.funcionalidades.permiteReportesAvanzados;
        suscripcion.permiteIntegracionesExternas = configPlan.funcionalidades.permiteIntegracionesExternas;
        suscripcion.permiteApiExterna = configPlan.funcionalidades.permiteApiExterna;
        suscripcion.permiteMultiplesSucursales = configPlan.funcionalidades.permiteMultiplesSucursales;
        suscripcion.permiteAppMovilDomiciliarios = configPlan.funcionalidades.permiteAppMovilDomiciliarios;
        suscripcion.soportePrioritario = configPlan.funcionalidades.soportePrioritario;

        await suscripcion.save({ transaction });
        await transaction.commit();

        logger.info(
            `Plan cambiado para empresa ${idEmpresa}: ${planAnterior} → ${nuevoPlan} por usuario ${idEjecutor || 'sistema'}`
        );

        return suscripcion;
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al cambiar plan: ${error.message}`);
        throw error;
    }
};

// =====================================================
// CORTESÍA (acceso gratis otorgado por el SuperAdmin)
// =====================================================

/**
 * Indica si una suscripción está en modo cortesía.
 * Se identifica por la marca en notasAdmin + precio 0 + fecha fin lejana.
 *
 * @param {Suscripcion} suscripcion
 * @returns {boolean}
 */
const esCortesia = (suscripcion) => {
    if (!suscripcion) return false;
    return (suscripcion.notasAdmin || '').includes(MARCA_CORTESIA)
        && Number(suscripcion.precioMensual) === 0
        && new Date(suscripcion.fechaFin).getFullYear() >= 2099;
};

/**
 * Activa el modo cortesía para una empresa: acceso completo y gratis,
 * sin vencimiento. Usa el plan 'enterprise' como base (todo desbloqueado),
 * pone precio 0 y una fecha fin muy lejana.
 *
 * @param {string} idEmpresa
 * @param {string} idEjecutor - SuperAdmin que la otorga
 * @returns {Promise<Suscripcion>}
 */
const activarCortesia = async (idEmpresa, idEjecutor = null) => {
    // Primero aplicamos los límites/funcionalidades de enterprise (todo desbloqueado)
    await cambiarPlan(idEmpresa, 'enterprise', idEjecutor);

    const suscripcion = await Suscripcion.findOne({ where: { idEmpresa } });
    if (!suscripcion) {
        throw new Error('La empresa no tiene una suscripción registrada');
    }

    suscripcion.precioMensual = 0;
    suscripcion.estado = 'activa';
    suscripcion.fechaFin = FECHA_CORTESIA_FIN;
    suscripcion.fechaProximoCobro = null;
    suscripcion.renovacionAutomatica = false;
    suscripcion.enPeriodoPrueba = false;
    suscripcion.fechaFinPrueba = null;

    // Marca de cortesía en las notas (sin duplicar si ya estaba)
    if (!(suscripcion.notasAdmin || '').includes(MARCA_CORTESIA)) {
        const sello = `[${new Date().toISOString()}] ${MARCA_CORTESIA}: acceso gratis otorgado por ${idEjecutor || 'sistema'}`;
        suscripcion.notasAdmin = sello + (suscripcion.notasAdmin ? `\n\n${suscripcion.notasAdmin}` : '');
    }

    await suscripcion.save();

    logger.info(`Cortesía activada para empresa ${idEmpresa} por ${idEjecutor || 'sistema'}`);
    return suscripcion;
};

/**
 * Quita la cortesía a una empresa: cae a plan 'premium' con 30 días de
 * prueba, para que decida si continúa pagando o no.
 *
 * @param {string} idEmpresa
 * @param {string} idEjecutor - SuperAdmin que la retira
 * @returns {Promise<Suscripcion>}
 */
const quitarCortesia = async (idEmpresa, idEjecutor = null) => {
    // Aplicar límites/funcionalidades de premium
    await cambiarPlan(idEmpresa, 'premium', idEjecutor);

    const suscripcion = await Suscripcion.findOne({ where: { idEmpresa } });
    if (!suscripcion) {
        throw new Error('La empresa no tiene una suscripción registrada');
    }

    const ahora = new Date();
    const fin30dias = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000);

    suscripcion.estado = 'activa';
    suscripcion.fechaInicio = ahora;
    suscripcion.fechaFin = fin30dias;
    suscripcion.fechaProximoCobro = fin30dias;
    suscripcion.renovacionAutomatica = true;
    suscripcion.enPeriodoPrueba = true;
    suscripcion.fechaFinPrueba = fin30dias;

    // Quitar la marca de cortesía de las notas, dejando registro del retiro
    const notasSinMarca = (suscripcion.notasAdmin || '')
        .split('\n')
        .filter((linea) => !linea.includes(MARCA_CORTESIA))
        .join('\n')
        .trim();
    const sello = `[${ahora.toISOString()}] Cortesía retirada por ${idEjecutor || 'sistema'}. Pasa a premium 30 días de prueba.`;
    suscripcion.notasAdmin = sello + (notasSinMarca ?` \n\n${notasSinMarca}` : '');

    await suscripcion.save();

    logger.info(`Cortesía retirada para empresa ${idEmpresa} por ${idEjecutor || 'sistema'}`);
    return suscripcion;
};

/**
 * Renueva una suscripción extendiendo la fecha de vencimiento
 *
 * Se usa cuando el cobro automático es exitoso o cuando el SuperAdmin
 * renueva manualmente una suscripción.
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} cicloRenovacion - 'mensual', 'trimestral', 'semestral', 'anual'
 * @returns {Promise<Suscripcion>} Suscripción renovada
 */
const renovarSuscripcion = async (idEmpresa, cicloRenovacion = 'mensual') => {
    const suscripcion = await Suscripcion.findOne({
        where: { idEmpresa }
    });

    if (!suscripcion) {
        throw new Error('La empresa no tiene suscripción para renovar');
    }

    const diasPorCiclo = {
        mensual: 30,
        trimestral: 90,
        semestral: 180,
        anual: 365
    };

    const diasExtension = diasPorCiclo[cicloRenovacion] || 30;
    const ahora = new Date();
    const fechaFinActual = new Date(suscripcion.fechaFin);

    const fechaBase = fechaFinActual > ahora ? fechaFinActual : ahora;
    const nuevaFechaFin = new Date(fechaBase.getTime() + diasExtension * 24 * 60 * 60 * 1000);

    suscripcion.fechaFin = nuevaFechaFin;
    suscripcion.fechaProximoCobro = nuevaFechaFin;
    suscripcion.estado = 'activa';
    suscripcion.ciclo = cicloRenovacion;
    suscripcion.enPeriodoPrueba = false;
    suscripcion.fechaFinPrueba = null;

    await suscripcion.save();

    logger.info(`Suscripción renovada: ${idEmpresa} hasta ${nuevaFechaFin.toISOString()}`);
    return suscripcion;
};

/**
 * Suspende una suscripción (típicamente por impago)
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} motivo - Razón de la suspensión
 * @param {string} idEjecutor - ID del SuperAdmin que ejecuta
 * @returns {Promise<Suscripcion>} Suscripción suspendida
 */
const suspenderSuscripcion = async (idEmpresa, motivo, idEjecutor = null) => {
    const suscripcion = await Suscripcion.findOne({
        where: { idEmpresa }
    });

    if (!suscripcion) {
        throw new Error('La empresa no tiene suscripción para suspender');
    }

    suscripcion.estado = 'suspendida';
    suscripcion.notasAdmin = `[${new Date().toISOString()}] Suspendida: ${motivo}` +
        (suscripcion.notasAdmin ? `\n\n${suscripcion.notasAdmin}` : '');

    await suscripcion.save();

    logger.warn(
        `Suscripción suspendida: ${idEmpresa}. Motivo: ${motivo}. Por: ${idEjecutor || 'sistema'}`
    );

    return suscripcion;
};

/**
 * Reactiva una suscripción suspendida
 * Útil cuando un cliente paga lo que debía
 *
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Suscripcion>} Suscripción reactivada
 */
const reactivarSuscripcion = async (idEmpresa) => {
    const suscripcion = await Suscripcion.findOne({
        where: { idEmpresa }
    });

    if (!suscripcion) {
        throw new Error('La empresa no tiene suscripción para reactivar');
    }

    suscripcion.estado = 'activa';
    await suscripcion.save();

    logger.info(`Suscripción reactivada: ${idEmpresa}`);
    return suscripcion;
};

/**
 * Cancela una suscripción
 *
 * No elimina la suscripción, solo cambia su estado a 'cancelada' y registra
 * quién canceló, cuándo y por qué para análisis posterior.
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} motivo - Razón de la cancelación
 * @param {string} idEjecutor - Quién ejecutó la cancelación
 * @returns {Promise<Suscripcion>} Suscripción cancelada
 */
const cancelarSuscripcion = async (idEmpresa, motivo, idEjecutor) => {
    const suscripcion = await Suscripcion.findOne({
        where: { idEmpresa }
    });

    if (!suscripcion) {
        throw new Error('La empresa no tiene suscripción para cancelar');
    }

    suscripcion.estado = 'cancelada';
    suscripcion.canceladaPor = idEjecutor;
    suscripcion.fechaCancelacion = new Date();
    suscripcion.motivoCancelacion = motivo;
    suscripcion.renovacionAutomatica = false;

    await suscripcion.save();

    logger.info(
        `Suscripción cancelada: ${idEmpresa}. Motivo: ${motivo}. Por: ${idEjecutor}`
    );

    return suscripcion;
};

/**
 * Marca suscripciones vencidas y las pone en período de gracia
 *
 * Este proceso lo debe ejecutar un job automático diariamente.
 * Las suscripciones vencidas pasan a 'periodo_gracia' por 7 días antes
 * de quedar definitivamente suspendidas.
 *
 * @returns {Promise<object>} { actualizadas, suspendidas }
 */
const procesarVencimientos = async () => {
    const { Op } = require('sequelize');
    const ahora = new Date();
    const haceSietesDias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000);

    try {
        const [actualizadas] = await Suscripcion.update(
            { estado: 'periodo_gracia' },
            {
                where: {
                    estado: 'activa',
                    fechaFin: { [Op.lt]: ahora }
                }
            }
        );

        const [suspendidas] = await Suscripcion.update(
            { estado: 'suspendida' },
            {
                where: {
                    estado: 'periodo_gracia',
                    fechaFin: { [Op.lt]: haceSietesDias }
                }
            }
        );

        if (actualizadas > 0 || suspendidas > 0) {
            logger.info(
                `Proceso de vencimientos: ${actualizadas} en período de gracia, ${suspendidas} suspendidas definitivamente`
            );
        }

        return { actualizadas, suspendidas };
    } catch (error) {
        logger.error(`Error al procesar vencimientos: ${error.message}`);
        throw error;
    }
};

/**
 * Obtiene estadísticas globales de suscripciones (solo para SuperAdmin)
 *
 * @returns {Promise<object>} Resumen completo de suscripciones del sistema
 */
const obtenerEstadisticasSuscripciones = async () => {
    try {
        const totalEmpresas = await Suscripcion.count();

        const porPlan = await Suscripcion.findAll({
            attributes: [
                'plan',
                [sequelize.fn('COUNT', sequelize.col('id_suscripcion')), 'cantidad']
            ],
            group: ['plan'],
            raw: true
        });

        const porEstado = await Suscripcion.findAll({
            attributes: [
                'estado',
                [sequelize.fn('COUNT', sequelize.col('id_suscripcion')), 'cantidad']
            ],
            group: ['estado'],
            raw: true
        });

        const ingresoMensualPotencial = await Suscripcion.sum('precio_mensual', {
            where: { estado: 'activa' }
        });

        return {
            totalEmpresas,
            porPlan: porPlan.reduce((acc, item) => {
                acc[item.plan] = parseInt(item.cantidad, 10);
                return acc;
            }, {}),
            porEstado: porEstado.reduce((acc, item) => {
                acc[item.estado] = parseInt(item.cantidad, 10);
                return acc;
            }, {}),
            ingresoMensualPotencial: parseFloat(ingresoMensualPotencial || 0)
        };
    } catch (error) {
        logger.error(`Error al obtener estadísticas: ${error.message}`);
        throw error;
    }
};

/**
 * Lista todas las suscripciones con sus empresas asociadas
 * Para el dashboard del SuperAdmin
 *
 * @param {object} filtros - { plan, estado, pagina, limit }
 * @returns {Promise<object>} { suscripciones, total, paginacion }
 */
const listarTodasLasSuscripciones = async (filtros = {}) => {
    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = Math.min(parseInt(filtros.limit, 10) || 20, 100);
    const offset = (pagina - 1) * limit;

    const where = {};

    if (filtros.plan) {
        where.plan = filtros.plan;
    }

    if (filtros.estado) {
        where.estado = filtros.estado;
    }

    const { count, rows } = await Suscripcion.findAndCountAll({
        where,
        limit,
        offset,
        order: [['fecha_creacion', 'DESC']]
    });

    return {
        suscripciones: rows,
        total: count,
        paginacion: {
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

module.exports = {
    cambiarPlan,
    esCortesia,
    activarCortesia,
    quitarCortesia,
    renovarSuscripcion,
    suspenderSuscripcion,
    reactivarSuscripcion,
    cancelarSuscripcion,
    procesarVencimientos,
    obtenerEstadisticasSuscripciones,
    listarTodasLasSuscripciones
};