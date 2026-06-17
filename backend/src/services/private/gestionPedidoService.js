const Pedido = require('../../models/Pedido');
const SeguimientoPedido = require('../../models/SeguimientoPedido');
const ReservaStock = require('../../models/ReservaStock');
const reservaService = require('./reservaService');
const domiciliarioService = require('./domiciliarioService');
const auditoriaService = require('./auditoriaService');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Gestión de Estados de Pedidos
 *
 * Maneja el ciclo de vida del pedido: confirmar, preparar, enviar, entregar
 * y cancelar. Respeta las transiciones válidas definidas en el modelo Pedido.
 *
 * Manejo de stock:
 *  - Al ENTREGAR: confirma las reservas (stock reservado -> salida real)
 *  - Al CANCELAR: libera las reservas (stock reservado -> disponible)
 *
 * Manejo de domiciliario:
 *  - Al ENTREGAR o CANCELAR: libera al domiciliario (vuelve a disponible)
 *
 * Auditoría:
 *  - Cada cambio de estado se registra en auditoría (entidad pedidos),
 *    con el estado anterior y el nuevo, sin afectar la operación si falla.
 */

// =====================================================
// REGISTRO DE SEGUIMIENTO
// =====================================================

/**
 * Registra un evento de seguimiento del pedido
 */
const registrarSeguimiento = async (idPedido, estado, descripcion, idUsuario, ubicacion = {}, transaction = null) => {
    const opciones = transaction ? { transaction } : {};
    return await SeguimientoPedido.create({
        idPedido,
        estado,
        descripcion,
        latitud: ubicacion.latitud || null,
        longitud: ubicacion.longitud || null,
        registradoPor: idUsuario
    }, opciones);
};

// =====================================================
// CAMBIO DE ESTADO GENÉRICO
// =====================================================

/**
 * Cambia el estado de un pedido validando la transición
 *
 * @param {string} idPedido - Pedido a cambiar
 * @param {string} idEmpresa - Empresa (validación tenant)
 * @param {string} nuevoEstado - Estado destino
 * @param {string} idUsuario - Usuario que hace el cambio
 * @param {object} opciones - { descripcion, ubicacion }
 * @returns {Promise<object>} { exito, pedido, mensaje }
 */
const cambiarEstado = async (idPedido, idEmpresa, nuevoEstado, idUsuario, opciones = {}) => {
    const pedido = await Pedido.findOne({
        where: { idPedido, idEmpresa, eliminado: false }
    });

    if (!pedido) {
        return { exito: false, mensaje: 'Pedido no encontrado' };
    }

    // Validar que la transición sea permitida
    if (!pedido.puedeTransicionarA(nuevoEstado)) {
        return {
            exito: false,
            mensaje: `No se puede pasar de "${pedido.etiquetaEstado()}" a "${nuevoEstado}". Transición no permitida.`
        };
    }

    // Casos especiales que tocan el stock
    if (nuevoEstado === 'entregado') {
        return await entregarPedido(pedido, idUsuario, opciones);
    }

    if (nuevoEstado === 'cancelado') {
        return await cancelarPedido(pedido, idUsuario, opciones);
    }

    // Guardar el estado anterior para la auditoría
    const estadoAnterior = pedido.estado;

    // Cambio de estado normal (sin tocar stock)
    const transaction = await sequelize.transaction();
    try {
        pedido.estado = nuevoEstado;

        if (nuevoEstado === 'confirmado') {
            pedido.fechaConfirmacion = new Date();
        }

        await pedido.save({ transaction });

        await registrarSeguimiento(
            pedido.idPedido,
            nuevoEstado,
            opciones.descripcion || `Pedido ${pedido.etiquetaEstado()}`,
            idUsuario,
            opciones.ubicacion || {},
            transaction
        );

        await transaction.commit();

        logger.info(`Pedido ${pedido.numeroPedido} cambió a estado ${nuevoEstado}`);

        // Auditoría del cambio de estado (no afecta la operación si falla)
        try {
            await auditoriaService.registrarAuditoria({
                idEmpresa,
                entidad: 'pedidos',
                idEntidad: pedido.idPedido,
                accion: 'UPDATE',
                valorAnterior: { estado: estadoAnterior },
                valorNuevo: { estado: nuevoEstado },
                realizadoPor: idUsuario,
                ip: opciones.ip || null
            });
        } catch (error) {
            logger.error(`Error al auditar cambio de estado: ${error.message}`);
        }

        return {
            exito: true,
            pedido: pedido.datosCompletos(),
            mensaje: `Pedido actualizado a ${pedido.etiquetaEstado()}`
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al cambiar estado del pedido: ${error.message}`);
        throw error;
    }
};

// =====================================================
// ENTREGA (consume el stock)
// =====================================================

/**
 * Marca un pedido como entregado y confirma las reservas
 * (el stock reservado se convierte en salida real de inventario)
 */
const entregarPedido = async (pedido, idUsuario, opciones = {}) => {
    // Buscar las reservas activas del pedido
    const reservas = await ReservaStock.findAll({
        where: {
            referenciaTipo: 'pedido',
            referenciaId: pedido.idPedido,
            estado: 'activa'
        }
    });

    // Confirmar cada reserva (cada una abre su propia transacción interna)
    // Esto convierte el stock reservado en salida real
    for (const reserva of reservas) {
        try {
            await reservaService.confirmarReserva(reserva.idReserva, {
                idUsuario,
                motivo: `Entrega del pedido ${pedido.numeroPedido}`,
                documentoSoporte: pedido.numeroPedido
            });
        } catch (error) {
            logger.error(`Error al confirmar reserva ${reserva.idReserva} en entrega: ${error.message}`);
            return {
                exito: false,
                mensaje: `Error al confirmar el stock del pedido: ${error.message}`
            };
        }
    }

    // Guardar el estado anterior para la auditoría
    const estadoAnterior = pedido.estado;

    // Actualizar el pedido a entregado
    const transaction = await sequelize.transaction();
    try {
        pedido.estado = 'entregado';
        pedido.fechaEntregaReal = new Date();
        await pedido.save({ transaction });

        await registrarSeguimiento(
            pedido.idPedido,
            'entregado',
            opciones.descripcion || 'Pedido entregado al cliente',
            idUsuario,
            opciones.ubicacion || {},
            transaction
        );

        await transaction.commit();

        // Liberar al domiciliario (vuelve a estar disponible para otro pedido)
        if (pedido.idDomiciliario) {
            try {
                await domiciliarioService.liberarDomiciliario(pedido.idPedido);
            } catch (error) {
                logger.error(`Error al liberar domiciliario tras entrega: ${error.message}`);
            }
        }

        logger.info(`Pedido ${pedido.numeroPedido} entregado. ${reservas.length} reservas confirmadas como salida.`);

        // Auditoría de la entrega (no afecta la operación si falla)
        try {
            await auditoriaService.registrarAuditoria({
                idEmpresa: pedido.idEmpresa,
                entidad: 'pedidos',
                idEntidad: pedido.idPedido,
                accion: 'UPDATE',
                valorAnterior: { estado: estadoAnterior },
                valorNuevo: { estado: 'entregado' },
                realizadoPor: idUsuario,
                ip: opciones.ip || null
            });
        } catch (error) {
            logger.error(`Error al auditar entrega: ${error.message}`);
        }

        return {
            exito: true,
            pedido: pedido.datosCompletos(),
            mensaje: 'Pedido entregado y stock descontado'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al marcar pedido como entregado: ${error.message}`);
        throw error;
    }
};

// =====================================================
// CANCELACIÓN (libera el stock)
// =====================================================

/**
 * Cancela un pedido y libera sus reservas (el stock vuelve a disponible)
 */
const cancelarPedido = async (pedido, idUsuario, opciones = {}) => {
    // Liberar todas las reservas activas del pedido
    const liberadas = await reservaService.liberarReservasPorReferencia(
        'pedido',
        pedido.idPedido,
        opciones.motivo || `Cancelación del pedido ${pedido.numeroPedido}`
    );

    // Guardar el estado anterior para la auditoría
    const estadoAnterior = pedido.estado;

    // Actualizar el pedido a cancelado
    const transaction = await sequelize.transaction();
    try {
        pedido.estado = 'cancelado';
        await pedido.save({ transaction });

        await registrarSeguimiento(
            pedido.idPedido,
            'cancelado',
            opciones.descripcion || opciones.motivo || 'Pedido cancelado',
            idUsuario,
            {},
            transaction
        );

        await transaction.commit();

        // Liberar al domiciliario si tenía uno asignado
        if (pedido.idDomiciliario) {
            try {
                await domiciliarioService.liberarDomiciliario(pedido.idPedido);
            } catch (error) {
                logger.error(`Error al liberar domiciliario tras cancelación: ${error.message}`);
            }
        }

        logger.info(`Pedido ${pedido.numeroPedido} cancelado. ${liberadas} reservas liberadas.`);

        // Auditoría de la cancelación (no afecta la operación si falla)
        try {
            await auditoriaService.registrarAuditoria({
                idEmpresa: pedido.idEmpresa,
                entidad: 'pedidos',
                idEntidad: pedido.idPedido,
                accion: 'UPDATE',
                valorAnterior: { estado: estadoAnterior },
                valorNuevo: { estado: 'cancelado' },
                realizadoPor: idUsuario,
                ip: opciones.ip || null
            });
        } catch (error) {
            logger.error(`Error al auditar cancelación: ${error.message}`);
        }

        return {
            exito: true,
            pedido: pedido.datosCompletos(),
            mensaje: 'Pedido cancelado y stock liberado'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al cancelar pedido: ${error.message}`);
        throw error;
    }
};

// =====================================================
// CANCELACIÓN POR PARTE DEL CLIENTE
// =====================================================

/**
 * Permite a un cliente cancelar su propio pedido
 * Solo si el pedido aún no ha sido despachado (no está en_camino ni más allá)
 */
const cancelarPedidoCliente = async (idPedido, idCliente, idUsuario, motivo = null) => {
    const pedido = await Pedido.findOne({
        where: { idPedido, idCliente, eliminado: false }
    });

    if (!pedido) {
        return { exito: false, mensaje: 'Pedido no encontrado o no es tuyo' };
    }

    // El cliente solo puede cancelar si NO ha sido despachado
    const estadosCancelablesPorCliente = ['pendiente', 'confirmado', 'en_preparacion'];
    if (!estadosCancelablesPorCliente.includes(pedido.estado)) {
        return {
            exito: false,
            mensaje: `No puedes cancelar un pedido en estado "${pedido.etiquetaEstado()}". Ya fue despachado o finalizado.`
        };
    }

    return await cancelarPedido(pedido, idUsuario, {
        motivo: motivo || 'Cancelado por el cliente',
        descripcion: 'El cliente canceló el pedido'
    });
};

module.exports = {
    cambiarEstado,
    entregarPedido,
    cancelarPedido,
    cancelarPedidoCliente,
    registrarSeguimiento
};