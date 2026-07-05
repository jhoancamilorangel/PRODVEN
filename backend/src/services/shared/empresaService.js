const Empresa = require('../../models/Empresa');
const Suscripcion = require('../../models/Suscripcion');
const ConfiguracionEmpresa = require('../../models/ConfiguracionEmpresa');
const Bodega = require('../../models/Bodega');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Empresas
 *
 * Centraliza toda la lógica reutilizable relacionada con empresas.
 * Maneja transacciones cuando se crean recursos relacionados.
 */

/**
 * Crea una empresa completa con su suscripción, configuración y bodega principal
 *
 * Esta operación crítica usa transacción de Sequelize para garantizar
 * que si algo falla, no quedemos con datos a medias.
 *
 * @param {object} datosEmpresa - Datos básicos de la empresa
 * @param {string} planInicial - Plan a asignar (default: 'free')
 * @param {string} idCreador - ID del SuperAdmin que crea la empresa
 * @param {object} opciones - { diasPruebaPersonalizado } para forzar días de prueba
 * @returns {Promise<object>} Objeto con empresa, suscripcion, configuracion y bodegaPrincipal
 */
const crearEmpresaCompleta = async (datosEmpresa, planInicial = 'free', idCreador = null, opciones = {}) => {
    const transaction = await sequelize.transaction();

    try {
        const empresa = await Empresa.create({
            ...datosEmpresa,
            estado: 'pendiente_verificacion',
            activo: true,
            eliminado: false
        }, { transaction });

        const configPlan = Suscripcion.obtenerConfiguracionPlan(planInicial);

        if (!configPlan) {
            throw new Error(`Plan inválido: ${planInicial}`);
        }

        // Días de prueba: si se pasa uno personalizado, manda ese; si no, el del plan
        const diasPrueba = opciones.diasPruebaPersonalizado !== undefined
            ? opciones.diasPruebaPersonalizado
            : configPlan.diasPrueba;

        const ahora = new Date();
        const diasVigencia = diasPrueba > 0 ? diasPrueba : 30;
        const fechaFin = new Date(ahora.getTime() + diasVigencia * 24 * 60 * 60 * 1000);
        const fechaFinPrueba = diasPrueba > 0
            ? new Date(ahora.getTime() + diasPrueba * 24 * 60 * 60 * 1000)
            : null;

        const suscripcion = await Suscripcion.create({
            idEmpresa: empresa.idEmpresa,
            plan: planInicial,
            estado: 'activa',
            precioMensual: configPlan.precioMensual,
            moneda: 'COP',
            ciclo: 'mensual',
            fechaInicio: ahora,
            fechaFin: fechaFin,
            fechaProximoCobro: fechaFin,
            renovacionAutomatica: true,
            limiteProductos: configPlan.limites.productos,
            limiteUsuarios: configPlan.limites.usuarios,
            limiteAlmacenamientoMb: configPlan.limites.almacenamientoMb,
            limitePedidosMensuales: configPlan.limites.pedidosMensuales,
            permiteMarketplace: configPlan.funcionalidades.permiteMarketplace,
            permiteReportesAvanzados: configPlan.funcionalidades.permiteReportesAvanzados,
            permiteIntegracionesExternas: configPlan.funcionalidades.permiteIntegracionesExternas,
            permiteApiExterna: configPlan.funcionalidades.permiteApiExterna,
            permiteMultiplesSucursales: configPlan.funcionalidades.permiteMultiplesSucursales,
            permiteAppMovilDomiciliarios: configPlan.funcionalidades.permiteAppMovilDomiciliarios,
            soportePrioritario: configPlan.funcionalidades.soportePrioritario,
            diasPrueba: diasPrueba,
            enPeriodoPrueba: diasPrueba > 0,
            fechaFinPrueba: fechaFinPrueba
        }, { transaction });

        const configDefault = ConfiguracionEmpresa.configuracionPorDefecto();
        const configuracion = await ConfiguracionEmpresa.create({
            idEmpresa: empresa.idEmpresa,
            ...configDefault
        }, { transaction });

        const bodegaPrincipal = await Bodega.create({
            idEmpresa: empresa.idEmpresa,
            nombre: 'Bodega Principal',
            codigo: 'PRIN',
            descripcion: 'Bodega principal creada automáticamente al registrar la empresa',
            esPrincipal: true,
            permiteVentas: true,
            permiteProduccion: true,
            activo: true,
            eliminado: false
        }, { transaction });

        await transaction.commit();

        logger.info(
            `Empresa creada: ${empresa.idEmpresa} (${empresa.nombre}) con plan ${planInicial} (${diasPrueba} días prueba) y bodega principal ${bodegaPrincipal.idBodega} por usuario ${idCreador || 'sistema'}`
        );

        return {
            empresa,
            suscripcion,
            configuracion,
            bodegaPrincipal
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear empresa completa: ${error.message}`);
        throw error;
    }
};

/**
 * VERIFICACIÓN PEREZOSA DE VENCIMIENTO DE PRUEBA
 *
 * Si una empresa está en período de prueba y este ya venció, la baja a
 * plan 'free' y la saca del marketplace (modoPublico = false). NO la
 * suspende: sigue operando su panel e inventario interno; solo pierde
 * el marketplace (que free no incluye), hasta que pague o reciba cortesía.
 *
 * Las cortesías (precio 0, fecha 2099) nunca entran aquí porque su prueba
 * no está activa y su fechaFin está muy en el futuro.
 *
 * Se llama antes de operaciones sensibles al plan (ej. activar marketplace).
 *
 * @param {string} idEmpresa
 * @returns {Promise<boolean>} true si se degradó en esta llamada
 */
const degradarPruebaVencida = async (idEmpresa) => {
    const suscripcion = await Suscripcion.findOne({ where: { idEmpresa } });
    if (!suscripcion) return false;

    // Solo aplica a suscripciones marcadas como en prueba
    if (!suscripcion.enPeriodoPrueba) return false;

    // ¿Ya venció la prueba?
    const finPrueba = suscripcion.fechaFinPrueba ? new Date(suscripcion.fechaFinPrueba) : null;
    if (!finPrueba || new Date() < finPrueba) return false; // aún vigente

    // La prueba venció: bajar a free
    const configFree = Suscripcion.obtenerConfiguracionPlan('free');

    suscripcion.plan = 'free';
    suscripcion.precioMensual = configFree.precioMensual;
    suscripcion.limiteProductos = configFree.limites.productos;
    suscripcion.limiteUsuarios = configFree.limites.usuarios;
    suscripcion.limiteAlmacenamientoMb = configFree.limites.almacenamientoMb;
    suscripcion.limitePedidosMensuales = configFree.limites.pedidosMensuales;
    suscripcion.permiteMarketplace = configFree.funcionalidades.permiteMarketplace;
    suscripcion.permiteReportesAvanzados = configFree.funcionalidades.permiteReportesAvanzados;
    suscripcion.permiteIntegracionesExternas = configFree.funcionalidades.permiteIntegracionesExternas;
    suscripcion.permiteApiExterna = configFree.funcionalidades.permiteApiExterna;
    suscripcion.permiteMultiplesSucursales = configFree.funcionalidades.permiteMultiplesSucursales;
    suscripcion.permiteAppMovilDomiciliarios = configFree.funcionalidades.permiteAppMovilDomiciliarios;
    suscripcion.soportePrioritario = configFree.funcionalidades.soportePrioritario;
    suscripcion.enPeriodoPrueba = false;
    suscripcion.fechaFinPrueba = null;
    // La suscripción free no "vence" en el sentido de bloquear el panel;
    // le damos una fecha fin lejana para que estaActiva() sea true.
    suscripcion.estado = 'activa';
    suscripcion.fechaFin = new Date('2099-12-31T23:59:59Z');
    suscripcion.fechaProximoCobro = null;
    await suscripcion.save();

    // Sacar la empresa del marketplace si estaba publicada
    const empresa = await Empresa.findByPk(idEmpresa);
    if (empresa && empresa.modoPublico) {
        empresa.modoPublico = false;
        await empresa.save();
    }

    logger.info(`Prueba vencida: empresa ${idEmpresa} degradada a free y retirada del marketplace`);
    return true;
};

/**
 * Obtiene una empresa con todos sus datos relacionados
 * (suscripción y configuración)
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {object} opciones - { incluirSuscripcion, incluirConfiguracion }
 * @returns {Promise<object>} Empresa con datos relacionados
 */
const obtenerEmpresaCompleta = async (idEmpresa, opciones = {}) => {
    const { incluirSuscripcion = true, incluirConfiguracion = true } = opciones;

    try {
        const empresa = await Empresa.findOne({
            where: {
                idEmpresa,
                eliminado: false
            }
        });

        if (!empresa) {
            return null;
        }

        const resultado = { empresa };

        if (incluirSuscripcion) {
            resultado.suscripcion = await Suscripcion.findOne({
                where: { idEmpresa }
            });
        }

        if (incluirConfiguracion) {
            resultado.configuracion = await ConfiguracionEmpresa.findOne({
                where: { idEmpresa }
            });
        }

        return resultado;
    } catch (error) {
        logger.error(`Error al obtener empresa completa: ${error.message}`);
        throw error;
    }
};

/**
 * Verifica si una empresa puede crear más productos según su plan
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {number} cantidadActual - Productos que ya tiene
 * @returns {Promise<object>} { puede, limite, restantes, mensaje }
 */
const puedeCrearMasProductos = async (idEmpresa, cantidadActual) => {
    try {
        const suscripcion = await Suscripcion.findOne({
            where: { idEmpresa }
        });

        if (!suscripcion) {
            return {
                puede: false,
                limite: 0,
                restantes: 0,
                mensaje: 'No hay suscripción activa'
            };
        }

        if (!suscripcion.estaActiva()) {
            return {
                puede: false,
                limite: suscripcion.limiteProductos,
                restantes: 0,
                mensaje: 'La suscripción no está activa'
            };
        }

        const restantes = suscripcion.limiteProductos - cantidadActual;
        const puede = restantes > 0;

        return {
            puede,
            limite: suscripcion.limiteProductos,
            restantes: Math.max(0, restantes),
            mensaje: puede
                ? `Puedes crear ${restantes} producto(s) más`
                : `Has alcanzado el límite de ${suscripcion.limiteProductos} productos de tu plan. Considera actualizar.`
        };
    } catch (error) {
        logger.error(`Error al verificar límite de productos: ${error.message}`);
        throw error;
    }
};

/**
 * Verifica si una empresa puede crear más usuarios según su plan
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {number} cantidadActual - Usuarios que ya tiene
 * @returns {Promise<object>} { puede, limite, restantes, mensaje }
 */
const puedeCrearMasUsuarios = async (idEmpresa, cantidadActual) => {
    try {
        const suscripcion = await Suscripcion.findOne({
            where: { idEmpresa }
        });

        if (!suscripcion) {
            return {
                puede: false,
                limite: 0,
                restantes: 0,
                mensaje: 'No hay suscripción activa'
            };
        }

        if (!suscripcion.estaActiva()) {
            return {
                puede: false,
                limite: suscripcion.limiteUsuarios,
                restantes: 0,
                mensaje: 'La suscripción no está activa'
            };
        }

        const restantes = suscripcion.limiteUsuarios - cantidadActual;
        const puede = restantes > 0;

        return {
            puede,
            limite: suscripcion.limiteUsuarios,
            restantes: Math.max(0, restantes),
            mensaje: puede
                ? `Puedes crear ${restantes} usuario(s) más`
                : `Has alcanzado el límite de ${suscripcion.limiteUsuarios} usuarios de tu plan. Considera actualizar.`
        };
    } catch (error) {
        logger.error(`Error al verificar límite de usuarios: ${error.message}`);
        throw error;
    }
};

/**
 * Verifica si una empresa tiene acceso a una funcionalidad específica
 * según su plan de suscripción
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} funcionalidad - Nombre de la funcionalidad
 * @returns {Promise<boolean>} true si tiene acceso
 */
const tieneAcceso = async (idEmpresa, funcionalidad) => {
    try {
        const suscripcion = await Suscripcion.findOne({
            where: { idEmpresa }
        });

        if (!suscripcion || !suscripcion.estaActiva()) {
            return false;
        }

        return suscripcion[funcionalidad] === true;
    } catch (error) {
        logger.error(`Error al verificar acceso a funcionalidad: ${error.message}`);
        return false;
    }
};

/**
 * Verifica que una empresa exista, esté operativa y devuelve sus datos
 * Lanza error si no cumple condiciones (útil en middlewares)
 *
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Empresa>} Empresa válida y operativa
 */
const validarEmpresaOperativa = async (idEmpresa) => {
    const empresa = await Empresa.findOne({
        where: {
            idEmpresa,
            eliminado: false
        }
    });

    if (!empresa) {
        const error = new Error('Empresa no encontrada');
        error.statusCode = 404;
        throw error;
    }

    if (!empresa.estaOperativa()) {
        const error = new Error('La empresa no está operativa actualmente');
        error.statusCode = 403;
        throw error;
    }

    return empresa;
};

/**
 * Activa una empresa (cambia estado a 'activa' y marca fecha de verificación)
 *
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Empresa>} Empresa actualizada
 */
const activarEmpresa = async (idEmpresa) => {
    const empresa = await Empresa.findByPk(idEmpresa);

    if (!empresa) {
        throw new Error('Empresa no encontrada');
    }

    empresa.estado = 'activa';
    empresa.activo = true;
    empresa.fechaVerificacion = new Date();
    await empresa.save();

    logger.info(`Empresa activada: ${idEmpresa}`);
    return empresa;
};

/**
 * Desactiva una empresa (mantiene datos, pero no permite operaciones)
 *
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Empresa>} Empresa actualizada
 */
const desactivarEmpresa = async (idEmpresa) => {
    const empresa = await Empresa.findByPk(idEmpresa);

    if (!empresa) {
        throw new Error('Empresa no encontrada');
    }

    empresa.estado = 'inactiva';
    empresa.activo = false;
    await empresa.save();

    logger.info(`Empresa desactivada: ${idEmpresa}`);
    return empresa;
};

/**
 * Suspende una empresa (por impago u otros motivos)
 * Diferente de desactivar: este es un bloqueo administrativo del SuperAdmin
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} motivo - Razón de la suspensión
 * @returns {Promise<Empresa>} Empresa actualizada
 */
const suspenderEmpresa = async (idEmpresa, motivo) => {
    const empresa = await Empresa.findByPk(idEmpresa);

    if (!empresa) {
        throw new Error('Empresa no encontrada');
    }

    empresa.estado = 'suspendida';
    empresa.activo = false;
    await empresa.save();

    logger.warn(`Empresa suspendida: ${idEmpresa}. Motivo: ${motivo || 'No especificado'}`);
    return empresa;
};

/**
 * Realiza un soft delete de una empresa
 * Los datos no se eliminan físicamente, solo se marcan como eliminados
 *
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Empresa>} Empresa actualizada
 */
const eliminarEmpresaLogicamente = async (idEmpresa) => {
    const empresa = await Empresa.findByPk(idEmpresa);

    if (!empresa) {
        throw new Error('Empresa no encontrada');
    }

    empresa.eliminado = true;
    empresa.activo = false;
    empresa.estado = 'inactiva';
    await empresa.save();

    logger.warn(`Empresa eliminada lógicamente: ${idEmpresa}`);
    return empresa;
};

/**
 * Cambia el modo público (marketplace) de una empresa
 * Verifica que el plan lo permita antes de activar.
 * Antes de decidir, ejecuta la verificación perezosa de vencimiento de
 * prueba, para que una empresa con prueba vencida no pueda activar el
 * marketplace (habrá caído a free en ese instante).
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {boolean} activar - true para activar, false para desactivar
 * @returns {Promise<object>} { exito, empresa, mensaje }
 */
const toggleMarketplace = async (idEmpresa, activar) => {
    // Verificación perezosa: si su prueba venció, aquí cae a free
    await degradarPruebaVencida(idEmpresa);

    const empresa = await Empresa.findByPk(idEmpresa);

    if (!empresa) {
        throw new Error('Empresa no encontrada');
    }

    if (activar) {
        const tieneAccesoMarketplace = await tieneAcceso(idEmpresa, 'permiteMarketplace');

        if (!tieneAccesoMarketplace) {
            return {
                exito: false,
                empresa,
                mensaje: 'Tu plan actual no incluye acceso al marketplace público. Considera actualizar a Básico o superior.'
            };
        }

        if (!empresa.estaOperativa()) {
            return {
                exito: false,
                empresa,
                mensaje: 'Tu empresa debe estar verificada y activa para aparecer en el marketplace'
            };
        }
    }

    empresa.modoPublico = activar;
    await empresa.save();

    logger.info(`Marketplace ${activar ? 'activado' : 'desactivado'} para empresa ${idEmpresa}`);

    return {
        exito: true,
        empresa,
        mensaje: activar
            ? 'Tu empresa ahora aparece en el marketplace público'
            : 'Tu empresa fue removida del marketplace público'
    };
};

/**
 * Lista empresas públicas para el marketplace
 * Devuelve solo empresas activas con modo público activado
 *
 * @param {object} filtros - { categoria, ciudad, busqueda, pagina, limit }
 * @returns {Promise<object>} { empresas, total, paginacion }
 */
const listarEmpresasPublicas = async (filtros = {}) => {
    const { Op } = require('sequelize');

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = Math.min(parseInt(filtros.limit, 10) || 20, 100);
    const offset = (pagina - 1) * limit;

    const where = {
        modoPublico: true,
        estado: 'activa',
        activo: true,
        eliminado: false
    };

    if (filtros.categoria) {
        where.categoria = filtros.categoria;
    }

    if (filtros.ciudad) {
        where.ciudad = filtros.ciudad;
    }

    if (filtros.busqueda) {
        where[Op.or] = [
            { nombre: { [Op.like]: `%${filtros.busqueda}%` } },
            { descripcionCorta: { [Op.like]: `%${filtros.busqueda}%` } }
        ];
    }

    const { count, rows } = await Empresa.findAndCountAll({
        where,
        limit,
        offset,
        order: [['calificacionPromedio', 'DESC'], ['nombre', 'ASC']]
    });

    return {
        empresas: rows.map(e => e.datosPublicos()),
        total: count,
        paginacion: {
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

module.exports = {
    crearEmpresaCompleta,
    degradarPruebaVencida,
    obtenerEmpresaCompleta,
    puedeCrearMasProductos,
    puedeCrearMasUsuarios,
    tieneAcceso,
    validarEmpresaOperativa,
    activarEmpresa,
    desactivarEmpresa,
    suspenderEmpresa,
    eliminarEmpresaLogicamente,
    toggleMarketplace,
    listarEmpresasPublicas
};