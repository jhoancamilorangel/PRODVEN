const UbicacionPedido = require('../../models/UbicacionPedido');
const Domiciliario = require('../../models/Domiciliario');
const Pedido = require('../../models/Pedido');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Ubicación y Domiciliarios (mínimo)
 *
 * Maneja el rastreo GPS de los pedidos en camino:
 *  - Registrar la posición del domiciliario (historial + última posición)
 *  - Consultar la última ubicación de un pedido
 *  - Consultar el recorrido completo
 *
 * Incluye una gestión mínima de domiciliarios (crear, listar), suficiente
 * para que el GPS funcione. El módulo completo de domiciliarios queda
 * para una fase futura.
 */

// =====================================================
// GESTIÓN MÍNIMA DE DOMICILIARIOS
// =====================================================

/**
 * Crea un domiciliario para una empresa
 */
const crearDomiciliario = async (idEmpresa, datos) => {
    const domiciliario = await Domiciliario.create({
        idEmpresa,
        idUsuario: datos.idUsuario,
        tipoVehiculo: datos.tipoVehiculo || 'moto',
        placa: datos.placa || null,
        documentoIdentidad: datos.documentoIdentidad,
        licenciaConduccion: datos.licenciaConduccion || null,
        disponible: true,
        activo: true
    });

    logger.info(`Domiciliario creado: ${domiciliario.idDomiciliario} para empresa ${idEmpresa}`);

    return domiciliario.datosCompletos();
};

/**
 * Lista los domiciliarios de una empresa
 */
const listarDomiciliarios = async (idEmpresa) => {
    const domiciliarios = await Domiciliario.findAll({
        where: { idEmpresa, activo: true },
        order: [['fecha_creacion', 'DESC']]
    });

    return domiciliarios.map(d => d.datosCompletos());
};

// =====================================================
// REGISTRO DE UBICACIÓN (GPS)
// =====================================================

/**
 * Registra una nueva ubicación del pedido en camino
 *
 * Guarda el punto en el historial (ubicacion_pedido) Y actualiza la última
 * posición conocida del domiciliario (domiciliarios).
 *
 * @param {object} datos - { idPedido, idDomiciliario, latitud, longitud, velocidad }
 * @returns {Promise<object>} { exito, ubicacion, mensaje }
 */
const registrarUbicacion = async (datos) => {
    const transaction = await sequelize.transaction();

    try {
        const { idPedido, idDomiciliario, latitud, longitud, velocidad } = datos;

        // Validar que el pedido exista y esté en camino
        const pedido = await Pedido.findByPk(idPedido, { transaction });

        if (!pedido) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Pedido no encontrado' };
        }

        if (pedido.estado !== 'en_camino') {
            await transaction.rollback();
            return {
                exito: false,
                mensaje: `Solo se puede rastrear un pedido en camino. Estado actual: ${pedido.etiquetaEstado()}`
            };
        }

        // Validar que el domiciliario exista
        const domiciliario = await Domiciliario.findByPk(idDomiciliario, { transaction });

        if (!domiciliario) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Domiciliario no encontrado' };
        }

        // Registrar el punto en el historial
        const ubicacion = await UbicacionPedido.create({
            idPedido,
            idDomiciliario,
            latitud,
            longitud,
            velocidad: velocidad || null
        }, { transaction });

        // Actualizar la última posición conocida del domiciliario
        domiciliario.ultimaLatitud = latitud;
        domiciliario.ultimaLongitud = longitud;
        domiciliario.ultimaActualizacion = new Date();
        await domiciliario.save({ transaction });

        await transaction.commit();

        return {
            exito: true,
            ubicacion: ubicacion.datosCompletos(),
            mensaje: 'Ubicación registrada'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al registrar ubicación: ${error.message}`);
        throw error;
    }
};

// =====================================================
// CONSULTAS DE UBICACIÓN
// =====================================================

/**
 * Obtiene la última ubicación conocida de un pedido
 */
const obtenerUltimaUbicacion = async (idPedido) => {
    const ubicacion = await UbicacionPedido.findOne({
        where: { idPedido },
        order: [['fecha_registro', 'DESC']]
    });

    if (!ubicacion) {
        return { exito: false, mensaje: 'Este pedido aún no tiene ubicaciones registradas' };
    }

    return { exito: true, ubicacion: ubicacion.datosCompletos() };
};

/**
 * Obtiene el recorrido completo de un pedido (todas las ubicaciones en orden)
 */
const obtenerRecorrido = async (idPedido) => {
    const ubicaciones = await UbicacionPedido.findAll({
        where: { idPedido },
        order: [['fecha_registro', 'ASC']]
    });

    return {
        total: ubicaciones.length,
        recorrido: ubicaciones.map(u => u.datosCompletos())
    };
};

module.exports = {
    crearDomiciliario,
    listarDomiciliarios,
    registrarUbicacion,
    obtenerUltimaUbicacion,
    obtenerRecorrido
};