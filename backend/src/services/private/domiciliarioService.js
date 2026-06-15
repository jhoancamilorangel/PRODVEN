const Domiciliario = require('../../models/Domiciliario');
const Pedido = require('../../models/Pedido');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Domiciliarios (módulo completo)
 *
 * Amplía la gestión básica de la Fase 10 con:
 *  - Edición y desactivación de domiciliarios
 *  - Gestión de disponibilidad (libre/ocupado)
 *  - Asignación automática a pedidos (al primer disponible)
 *  - Liberación al completar la entrega
 *
 * La asignación automática está preparada para evolucionar a "más cercano"
 * cuando exista la app del domiciliario que reporte ubicaciones en tiempo real.
 */

// =====================================================
// GESTIÓN DE DOMICILIARIOS
// =====================================================

/**
 * Actualiza los datos de un domiciliario
 */
const actualizarDomiciliario = async (idDomiciliario, idEmpresa, datos) => {
    const domiciliario = await Domiciliario.findOne({
        where: { idDomiciliario, idEmpresa }
    });

    if (!domiciliario) {
        return { exito: false, mensaje: 'Domiciliario no encontrado' };
    }

    const camposActualizables = ['tipoVehiculo', 'placa', 'documentoIdentidad', 'licenciaConduccion'];
    for (const campo of camposActualizables) {
        if (datos[campo] !== undefined) {
            domiciliario[campo] = datos[campo];
        }
    }

    await domiciliario.save();

    return { exito: true, domiciliario: domiciliario.datosCompletos(), mensaje: 'Domiciliario actualizado' };
};

/**
 * Cambia la disponibilidad de un domiciliario (libre/ocupado)
 */
const cambiarDisponibilidad = async (idDomiciliario, idEmpresa, disponible) => {
    const domiciliario = await Domiciliario.findOne({
        where: { idDomiciliario, idEmpresa }
    });

    if (!domiciliario) {
        return { exito: false, mensaje: 'Domiciliario no encontrado' };
    }

    domiciliario.disponible = disponible;
    await domiciliario.save();

    const estado = disponible ? 'disponible' : 'ocupado';
    return { exito: true, domiciliario: domiciliario.datosCompletos(), mensaje: `Domiciliario marcado como ${estado}` };
};

/**
 * Desactiva un domiciliario (baja lógica)
 */
const desactivarDomiciliario = async (idDomiciliario, idEmpresa) => {
    const domiciliario = await Domiciliario.findOne({
        where: { idDomiciliario, idEmpresa }
    });

    if (!domiciliario) {
        return { exito: false, mensaje: 'Domiciliario no encontrado' };
    }

    domiciliario.activo = false;
    domiciliario.disponible = false;
    await domiciliario.save();

    return { exito: true, mensaje: 'Domiciliario desactivado' };
};

/**
 * Lista los domiciliarios disponibles de una empresa
 */
const listarDisponibles = async (idEmpresa) => {
    const domiciliarios = await Domiciliario.findAll({
        where: { idEmpresa, activo: true, disponible: true },
        order: [['fecha_creacion', 'ASC']]
    });

    return domiciliarios.map(d => d.datosCompletos());
};

// =====================================================
// ASIGNACIÓN A PEDIDOS
// =====================================================

/**
 * Asigna automáticamente un domiciliario disponible a un pedido
 *
 * Estrategia actual: el primer domiciliario disponible (orden de antigüedad).
 * Preparado para evolucionar a "más cercano" cuando haya ubicaciones en
 * tiempo real desde la app del domiciliario.
 *
 * @param {string} idPedido - Pedido a asignar
 * @param {string} idEmpresa - Empresa
 * @returns {Promise<object>} { exito, domiciliario, mensaje }
 */
const asignarAutomatico = async (idPedido, idEmpresa) => {
    const transaction = await sequelize.transaction();

    try {
        const pedido = await Pedido.findOne({
            where: { idPedido, idEmpresa, eliminado: false },
            transaction
        });

        if (!pedido) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Pedido no encontrado' };
        }

        if (pedido.idDomiciliario) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Este pedido ya tiene un domiciliario asignado' };
        }

        // Buscar el primer domiciliario disponible
        const domiciliario = await Domiciliario.findOne({
            where: { idEmpresa, activo: true, disponible: true },
            order: [['fecha_creacion', 'ASC']],
            transaction
        });

        if (!domiciliario) {
            await transaction.rollback();
            return { exito: false, mensaje: 'No hay domiciliarios disponibles en este momento' };
        }

        // Asignar el domiciliario al pedido y marcarlo como ocupado
        pedido.idDomiciliario = domiciliario.idDomiciliario;
        await pedido.save({ transaction });

        domiciliario.disponible = false;
        await domiciliario.save({ transaction });

        await transaction.commit();

        logger.info(`Domiciliario ${domiciliario.idDomiciliario} asignado al pedido ${idPedido}`);

        return {
            exito: true,
            domiciliario: domiciliario.datosCompletos(),
            mensaje: 'Domiciliario asignado automáticamente'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al asignar domiciliario: ${error.message}`);
        throw error;
    }
};

/**
 * Asigna manualmente un domiciliario específico a un pedido
 */
const asignarManual = async (idPedido, idDomiciliario, idEmpresa) => {
    const transaction = await sequelize.transaction();

    try {
        const pedido = await Pedido.findOne({
            where: { idPedido, idEmpresa, eliminado: false },
            transaction
        });

        if (!pedido) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Pedido no encontrado' };
        }

        const domiciliario = await Domiciliario.findOne({
            where: { idDomiciliario, idEmpresa, activo: true },
            transaction
        });

        if (!domiciliario) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Domiciliario no encontrado o inactivo' };
        }

        if (!domiciliario.disponible) {
            await transaction.rollback();
            return { exito: false, mensaje: 'El domiciliario no está disponible' };
        }

        pedido.idDomiciliario = domiciliario.idDomiciliario;
        await pedido.save({ transaction });

        domiciliario.disponible = false;
        await domiciliario.save({ transaction });

        await transaction.commit();

        logger.info(`Domiciliario ${idDomiciliario} asignado manualmente al pedido ${idPedido}`);

        return {
            exito: true,
            domiciliario: domiciliario.datosCompletos(),
            mensaje: 'Domiciliario asignado'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al asignar domiciliario manual: ${error.message}`);
        throw error;
    }
};

/**
 * Libera al domiciliario de un pedido (lo marca disponible de nuevo)
 * Se llama cuando el pedido se entrega o se cancela
 */
const liberarDomiciliario = async (idPedido) => {
    const transaction = await sequelize.transaction();

    try {
        const pedido = await Pedido.findByPk(idPedido, { transaction });

        if (!pedido || !pedido.idDomiciliario) {
            await transaction.rollback();
            return { exito: false, mensaje: 'El pedido no tiene domiciliario asignado' };
        }

        const domiciliario = await Domiciliario.findByPk(pedido.idDomiciliario, { transaction });

        if (domiciliario) {
            domiciliario.disponible = true;
            await domiciliario.save({ transaction });
        }

        await transaction.commit();

        logger.info(`Domiciliario liberado del pedido ${idPedido}`);

        return { exito: true, mensaje: 'Domiciliario liberado' };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al liberar domiciliario: ${error.message}`);
        throw error;
    }
};

module.exports = {
    actualizarDomiciliario,
    cambiarDisponibilidad,
    desactivarDomiciliario,
    listarDisponibles,
    asignarAutomatico,
    asignarManual,
    liberarDomiciliario
};