const Promocion = require('../../models/Promocion');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');
const { Op } = require('sequelize');

/**
 * Servicio de Promociones
 *
 * Maneja los descuentos de la empresa:
 *  - Gestión: crear, listar, editar, desactivar
 *  - Validar una promoción (por código o id) y calcular su descuento
 *  - Registrar el uso de una promoción
 *
 * Implementa a fondo los tipos 'porcentaje' y 'valor_fijo'.
 * Los tipos '2x1' y 'envio_gratis' quedan preparados en la estructura.
 */

// =====================================================
// GESTIÓN DE PROMOCIONES
// =====================================================

/**
 * Crea una promoción
 */
const crearPromocion = async (idEmpresa, datos) => {
    // Validaciones de negocio según el tipo
    if (datos.tipo === 'porcentaje') {
        const valor = parseFloat(datos.valor);
        if (valor <= 0 || valor > 100) {
            return { exito: false, mensaje: 'El porcentaje debe estar entre 1 y 100' };
        }
    }

    if (datos.tipo === 'valor_fijo') {
        if (parseFloat(datos.valor) <= 0) {
            return { exito: false, mensaje: 'El valor del descuento debe ser mayor a cero' };
        }
    }

    // Validar fechas
    const inicio = new Date(datos.fechaInicio);
    const fin = new Date(datos.fechaFin);
    if (fin <= inicio) {
        return { exito: false, mensaje: 'La fecha de fin debe ser posterior a la de inicio' };
    }

    // Si trae código, verificar que no exista ya (es único)
    if (datos.codigo) {
        const existente = await Promocion.findOne({
            where: { codigo: datos.codigo, eliminado: false }
        });
        if (existente) {
            return { exito: false, mensaje: 'Ya existe una promoción con ese código' };
        }
    }

    const promocion = await Promocion.create({
        idEmpresa,
        idProducto: datos.idProducto || null,
        nombre: datos.nombre,
        descripcion: datos.descripcion || null,
        tipo: datos.tipo,
        valor: datos.valor,
        codigo: datos.codigo || null,
        usoMaximo: datos.usoMaximo !== undefined ? datos.usoMaximo : null,
        usoActual: 0,
        fechaInicio: datos.fechaInicio,
        fechaFin: datos.fechaFin,
        activo: true
    });

    logger.info(`Promoción creada: ${promocion.idPromocion} en empresa ${idEmpresa}`);

    return { exito: true, promocion: promocion.datosCompletos(), mensaje: 'Promoción creada' };
};

/**
 * Lista las promociones de una empresa
 */
const listarPromociones = async (idEmpresa, filtros = {}) => {
    const where = { idEmpresa, eliminado: false };

    // Filtro opcional: solo activas y vigentes
    if (filtros.soloVigentes === 'true' || filtros.soloVigentes === true) {
        where.activo = true;
        const ahora = new Date();
        where.fechaInicio = { [Op.lte]: ahora };
        where.fechaFin = { [Op.gte]: ahora };
    }

    const promociones = await Promocion.findAll({
        where,
        order: [['fecha_creacion', 'DESC']]
    });

    return { promociones: promociones.map(p => p.datosCompletos()) };
};

/**
 * Obtiene una promoción específica
 */
const obtenerPromocion = async (idPromocion, idEmpresa) => {
    const promocion = await Promocion.findOne({
        where: { idPromocion, idEmpresa, eliminado: false }
    });

    return promocion ? promocion.datosCompletos() : null;
};

/**
 * Actualiza una promoción
 */
const actualizarPromocion = async (idPromocion, idEmpresa, datos) => {
    const promocion = await Promocion.findOne({
        where: { idPromocion, idEmpresa, eliminado: false }
    });

    if (!promocion) {
        return { exito: false, mensaje: 'Promoción no encontrada' };
    }

    const camposActualizables = ['nombre', 'descripcion', 'valor', 'usoMaximo', 'fechaInicio', 'fechaFin', 'activo'];
    for (const campo of camposActualizables) {
        if (datos[campo] !== undefined) {
            promocion[campo] = datos[campo];
        }
    }

    await promocion.save();

    return { exito: true, promocion: promocion.datosCompletos(), mensaje: 'Promoción actualizada' };
};

/**
 * Desactiva (elimina lógicamente) una promoción
 */
const desactivarPromocion = async (idPromocion, idEmpresa) => {
    const promocion = await Promocion.findOne({
        where: { idPromocion, idEmpresa, eliminado: false }
    });

    if (!promocion) {
        return { exito: false, mensaje: 'Promoción no encontrada' };
    }

    promocion.eliminado = true;
    promocion.activo = false;
    await promocion.save();

    return { exito: true, mensaje: 'Promoción eliminada' };
};

// =====================================================
// VALIDACIÓN Y APLICACIÓN
// =====================================================

/**
 * Valida una promoción por código y calcula el descuento para un monto dado
 *
 * Verifica: que exista, sea de la empresa, esté activa, vigente, con usos
 * disponibles. Si todo bien, calcula el descuento.
 *
 * @param {string} idEmpresa - Empresa
 * @param {string} codigo - Código de la promoción
 * @param {number} monto - Monto del pedido (subtotal) sobre el que aplicar
 * @returns {Promise<object>} { valida, descuento, promocion, mensaje }
 */
const validarPromocionPorCodigo = async (idEmpresa, codigo, monto) => {
    const promocion = await Promocion.findOne({
        where: { codigo, idEmpresa, eliminado: false }
    });

    if (!promocion) {
        return { valida: false, mensaje: 'El código de promoción no existe' };
    }

    if (!promocion.activo) {
        return { valida: false, mensaje: 'La promoción no está activa' };
    }

    if (!promocion.estaVigente()) {
        return { valida: false, mensaje: 'La promoción está fuera de su período de validez' };
    }

    if (!promocion.tieneUsosDisponibles()) {
        return { valida: false, mensaje: 'La promoción ya alcanzó su límite de usos' };
    }

    const descuento = promocion.calcularDescuento(monto);

    return {
        valida: true,
        descuento,
        promocion: promocion.datosCompletos(),
        mensaje: `Promoción aplicada: descuento de ${descuento}`
    };
};

/**
 * Registra el uso de una promoción (incrementa uso_actual)
 * Se llama cuando un pedido con promoción se confirma
 */
const registrarUso = async (idPromocion) => {
    const transaction = await sequelize.transaction();

    try {
        const promocion = await Promocion.findByPk(idPromocion, { transaction });

        if (!promocion) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Promoción no encontrada' };
        }

        promocion.usoActual = promocion.usoActual + 1;
        await promocion.save({ transaction });

        await transaction.commit();

        logger.info(`Uso registrado para promoción ${idPromocion}. Total usos: ${promocion.usoActual}`);

        return { exito: true, usoActual: promocion.usoActual };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al registrar uso de promoción: ${error.message}`);
        throw error;
    }
};

module.exports = {
    crearPromocion,
    listarPromociones,
    obtenerPromocion,
    actualizarPromocion,
    desactivarPromocion,
    validarPromocionPorCodigo,
    registrarUso
};