const ReservaStock = require('../../models/ReservaStock');
const StockProducto = require('../../models/StockProducto');
const Producto = require('../../models/Producto');
const inventarioService = require('./inventarioService');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Reservas de Stock
 *
 * Maneja el ciclo de vida completo de las reservas:
 *  - Crear reserva (apartar stock)
 *  - Confirmar reserva (convertir en salida real al completar pedido)
 *  - Liberar reserva (devolver stock al disponible)
 *  - Expirar reservas viejas automáticamente
 *
 * Las reservas son lo que evita que dos clientes compren la última unidad
 * al mismo tiempo. Cuando un cliente confirma un pedido, su stock queda
 * apartado hasta que pague o cancele.
 */

// Tiempo por defecto de expiración de una reserva (30 minutos)
const MINUTOS_EXPIRACION_DEFAULT = 30;

// =====================================================
// CREACIÓN DE RESERVAS
// =====================================================

/**
 * Crea una reserva de stock para un producto
 *
 * Valida que haya stock disponible suficiente y aparta la cantidad.
 * El stock físico no cambia, solo se incrementa cantidadReservada.
 *
 * @param {object} datos - Datos de la reserva
 * @param {string} datos.idEmpresa - Empresa
 * @param {string} datos.idProducto - Producto a reservar
 * @param {number} datos.cantidad - Cantidad a apartar
 * @param {object} datos.referencia - { tipo, id } del origen
 * @param {string} datos.idBodega - Bodega (opcional)
 * @param {string} datos.idUsuario - Usuario que crea la reserva
 * @param {number} datos.minutosExpiracion - Minutos antes de expirar (opcional)
 * @param {string} datos.observaciones - Notas adicionales
 * @returns {Promise<object>} { exito, reserva, mensaje }
 */
const crearReserva = async (datos) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            idEmpresa,
            idProducto,
            cantidad,
            referencia,
            idUsuario = null,
            minutosExpiracion = MINUTOS_EXPIRACION_DEFAULT,
            observaciones = null
        } = datos;

        if (!idEmpresa || !idProducto || !cantidad || !referencia) {
            throw new Error('Faltan datos obligatorios para crear la reserva');
        }

        if (parseFloat(cantidad) <= 0) {
            throw new Error('La cantidad a reservar debe ser mayor a cero');
        }

        if (!referencia.tipo || !referencia.id) {
            throw new Error('La referencia debe incluir tipo e id');
        }

        let idBodega = datos.idBodega;

        if (!idBodega) {
            const bodegaPrincipal = await inventarioService.obtenerBodegaPrincipal(idEmpresa);
            if (!bodegaPrincipal) {
                throw new Error('La empresa no tiene bodega principal configurada');
            }
            idBodega = bodegaPrincipal.idBodega;
        }

        const stock = await inventarioService.obtenerOCrearStock(
            idEmpresa,
            idProducto,
            idBodega,
            transaction
        );

        const producto = await Producto.findOne({
            where: { idProducto, idEmpresa, eliminado: false },
            transaction
        });

        if (!producto) {
            throw new Error('Producto no encontrado');
        }

        const disponible = stock.cantidadDisponible();
        const cantidadSolicitada = parseFloat(cantidad);

        if (producto.gestionaStock && !producto.permiteVentaSinStock) {
            if (disponible < cantidadSolicitada) {
                await transaction.rollback();
                return {
                    exito: false,
                    reserva: null,
                    mensaje: `Stock insuficiente. Disponible: ${disponible}, solicitado: ${cantidadSolicitada}`,
                    disponible
                };
            }
        }

        const fechaExpiracion = new Date(Date.now() + minutosExpiracion * 60 * 1000);

        const reserva = await ReservaStock.create({
            idEmpresa,
            idProducto,
            idBodega,
            cantidad: cantidadSolicitada,
            referenciaTipo: referencia.tipo,
            referenciaId: referencia.id,
            estado: 'activa',
            fechaExpiracion,
            idUsuario,
            observaciones
        }, { transaction });

        stock.cantidadReservada = parseFloat(stock.cantidadReservada) + cantidadSolicitada;
        await stock.save({ transaction });

        await transaction.commit();

        logger.info(
            `Reserva creada: ${reserva.idReserva} de ${cantidadSolicitada} unidades del producto ${idProducto}`
        );

        return {
            exito: true,
            reserva,
            mensaje: 'Reserva creada correctamente'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear reserva: ${error.message}`);
        throw error;
    }
};

// =====================================================
// CONFIRMACIÓN DE RESERVAS
// =====================================================

/**
 * Confirma una reserva convirtiéndola en salida real de inventario
 *
 * Se llama cuando el pedido se completa y se entrega.
 * Crea un movimiento de salida_venta y libera la cantidad reservada
 * (porque ahora se convirtió en salida física real).
 *
 * @param {string} idReserva - ID de la reserva a confirmar
 * @param {object} opciones - { motivo, idUsuario, documentoSoporte }
 * @returns {Promise<object>} Reserva confirmada y movimiento generado
 */
const confirmarReserva = async (idReserva, opciones = {}) => {
    const transaction = await sequelize.transaction();

    try {
        const reserva = await ReservaStock.findOne({
            where: { idReserva },
            transaction
        });

        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }

        if (reserva.estado !== 'activa') {
            throw new Error(`No se puede confirmar una reserva en estado: ${reserva.estado}`);
        }

        const stock = await StockProducto.findOne({
            where: { idProducto: reserva.idProducto, idBodega: reserva.idBodega },
            transaction
        });

        if (!stock) {
            throw new Error('Stock no encontrado para esta reserva');
        }

        stock.cantidadReservada = Math.max(0, parseFloat(stock.cantidadReservada) - parseFloat(reserva.cantidad));
        await stock.save({ transaction });

        reserva.estado = 'confirmada';
        reserva.fechaConfirmacion = new Date();
        await reserva.save({ transaction });

        await transaction.commit();

        const resultadoMovimiento = await inventarioService.registrarMovimiento({
            idEmpresa: reserva.idEmpresa,
            idProducto: reserva.idProducto,
            idBodega: reserva.idBodega,
            tipo: 'salida_venta',
            cantidad: parseFloat(reserva.cantidad),
            costoUnitario: parseFloat(stock.costoPromedio),
            idUsuario: opciones.idUsuario || null,
            motivo: opciones.motivo || 'Confirmación de reserva',
            referencia: {
                tipo: reserva.referenciaTipo,
                id: reserva.referenciaId
            },
            documentoSoporte: opciones.documentoSoporte || null
        });

        logger.info(`Reserva ${idReserva} confirmada como salida de venta`);

        return {
            reserva,
            movimiento: resultadoMovimiento.movimiento
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al confirmar reserva: ${error.message}`);
        throw error;
    }
};

// =====================================================
// LIBERACIÓN DE RESERVAS
// =====================================================

/**
 * Libera una reserva devolviendo el stock al disponible
 *
 * Se llama cuando el pedido se cancela o el cliente abandona el carrito.
 * Decrementa cantidadReservada sin tocar cantidadFisica.
 *
 * @param {string} idReserva - ID de la reserva a liberar
 * @param {string} motivo - Razón de la liberación
 * @returns {Promise<ReservaStock>} Reserva liberada
 */
const liberarReserva = async (idReserva, motivo = null) => {
    const transaction = await sequelize.transaction();

    try {
        const reserva = await ReservaStock.findOne({
            where: { idReserva },
            transaction
        });

        if (!reserva) {
            throw new Error('Reserva no encontrada');
        }

        if (reserva.estado !== 'activa') {
            throw new Error(`No se puede liberar una reserva en estado: ${reserva.estado}`);
        }

        const stock = await StockProducto.findOne({
            where: { idProducto: reserva.idProducto, idBodega: reserva.idBodega },
            transaction
        });

        if (stock) {
            stock.cantidadReservada = Math.max(
                0,
                parseFloat(stock.cantidadReservada) - parseFloat(reserva.cantidad)
            );
            await stock.save({ transaction });
        }

        reserva.estado = 'liberada';
        reserva.fechaLiberacion = new Date();
        reserva.motivoLiberacion = motivo || 'Liberación manual';
        await reserva.save({ transaction });

        await transaction.commit();

        logger.info(`Reserva ${idReserva} liberada. Motivo: ${reserva.motivoLiberacion}`);

        return reserva;
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al liberar reserva: ${error.message}`);
        throw error;
    }
};

/**
 * Libera todas las reservas activas asociadas a una referencia
 * Útil cuando se cancela un pedido completo con múltiples productos
 *
 * @param {string} tipo - Tipo de referencia (pedido, orden_produccion)
 * @param {string} id - ID de la referencia
 * @param {string} motivo - Motivo de liberación
 * @returns {Promise<number>} Cantidad de reservas liberadas
 */
const liberarReservasPorReferencia = async (tipo, id, motivo = null) => {
    const reservas = await ReservaStock.findAll({
        where: {
            referenciaTipo: tipo,
            referenciaId: id,
            estado: 'activa'
        }
    });

    let liberadas = 0;

    for (const reserva of reservas) {
        try {
            await liberarReserva(reserva.idReserva, motivo);
            liberadas += 1;
        } catch (error) {
            logger.error(`Error al liberar reserva ${reserva.idReserva}: ${error.message}`);
        }
    }

    logger.info(`${liberadas} de ${reservas.length} reservas liberadas para ${tipo}:${id}`);
    return liberadas;
};

// =====================================================
// EXPIRACIÓN AUTOMÁTICA
// =====================================================

/**
 * Expira automáticamente las reservas activas que ya pasaron su fecha
 *
 * Este proceso debe ejecutarse periódicamente (cada X minutos) como job.
 * Libera todas las reservas vencidas y devuelve su stock al disponible.
 *
 * @returns {Promise<object>} { expiradas, errores }
 */
const procesarReservasExpiradas = async () => {
    const { Op } = require('sequelize');
    const ahora = new Date();

    const reservasVencidas = await ReservaStock.findAll({
        where: {
            estado: 'activa',
            fechaExpiracion: { [Op.lt]: ahora }
        }
    });

    let expiradas = 0;
    let errores = 0;

    for (const reserva of reservasVencidas) {
        try {
            const transaction = await sequelize.transaction();

            const stock = await StockProducto.findOne({
                where: { idProducto: reserva.idProducto, idBodega: reserva.idBodega },
                transaction
            });

            if (stock) {
                stock.cantidadReservada = Math.max(
                    0,
                    parseFloat(stock.cantidadReservada) - parseFloat(reserva.cantidad)
                );
                await stock.save({ transaction });
            }

            reserva.estado = 'expirada';
            reserva.fechaLiberacion = new Date();
            reserva.motivoLiberacion = 'Expiración automática por tiempo';
            await reserva.save({ transaction });

            await transaction.commit();
            expiradas += 1;
        } catch (error) {
            errores += 1;
            logger.error(`Error al expirar reserva ${reserva.idReserva}: ${error.message}`);
        }
    }

    if (expiradas > 0 || errores > 0) {
        logger.info(`Proceso de expiración: ${expiradas} reservas expiradas, ${errores} errores`);
    }

    return { expiradas, errores };
};

// =====================================================
// CONSULTAS DE RESERVAS
// =====================================================

/**
 * Lista las reservas activas de un producto
 *
 * @param {string} idProducto - Producto a consultar
 * @returns {Promise<Array>} Lista de reservas activas
 */
const listarReservasActivasProducto = async (idProducto) => {
    return await ReservaStock.findAll({
        where: {
            idProducto,
            estado: 'activa'
        },
        order: [['fecha_creacion', 'ASC']]
    });
};

/**
 * Obtiene la suma total de reservas activas para un producto
 *
 * @param {string} idProducto - Producto a consultar
 * @returns {Promise<number>} Total reservado
 */
const obtenerTotalReservado = async (idProducto) => {
    const total = await ReservaStock.sum('cantidad', {
        where: {
            idProducto,
            estado: 'activa'
        }
    });

    return parseFloat(total || 0);
};

module.exports = {
    crearReserva,
    confirmarReserva,
    liberarReserva,
    liberarReservasPorReferencia,
    procesarReservasExpiradas,
    listarReservasActivasProducto,
    obtenerTotalReservado
};