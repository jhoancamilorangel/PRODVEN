const Pedido = require('../../models/Pedido');
const DetallePedido = require('../../models/DetallePedido');
const SeguimientoPedido = require('../../models/SeguimientoPedido');
const Carrito = require('../../models/Carrito');
const ItemCarrito = require('../../models/ItemCarrito');
const Producto = require('../../models/Producto');
const Cliente = require('../../models/Cliente');
const reservaService = require('./reservaService');
const carritoService = require('./carritoService');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Pedidos
 *
 * Maneja la conversión de carrito a pedido, que es el corazón de la venta.
 * Al crear un pedido se reserva el stock (Fase 7). El stock se consume de
 * verdad al entregar (Bloque 3). La relación cliente-empresa vive aquí.
 */

// =====================================================
// GENERACIÓN DE NÚMERO DE PEDIDO
// =====================================================

/**
 * Genera un número de pedido único y legible para la empresa
 * Formato: PED-AÑO-NNNNN (ej: PED-2026-00042)
 */
const generarNumeroPedido = async (idEmpresa, transaction) => {
    const anio = new Date().getFullYear();
    const prefijo = `PED-${anio}-`;

    // Cuenta cuántos pedidos tiene la empresa este año para el correlativo
    const { Op } = require('sequelize');
    const cantidad = await Pedido.count({
        where: {
            idEmpresa,
            numeroPedido: { [Op.like]: `${prefijo}%`}
        },
        transaction
    });

    const correlativo = String(cantidad + 1).padStart(5, '0');
    return `${prefijo}${correlativo}`;
};

// =====================================================
// CONVERSIÓN DE CARRITO A PEDIDO
// =====================================================

/**
 * Convierte el carrito activo del cliente en un pedido formal
 *
 * @param {string} idUsuario - Usuario autenticado que compra
 * @param {string} idEmpresa - Empresa a la que se compra
 * @param {object} datos - Datos de entrega y pago
 * @returns {Promise<object>} { exito, pedido, mensaje }
 */
const crearPedidoDesdeCarrito = async (idUsuario, idEmpresa, datos = {}) => {
    // 1. Resolver el cliente del usuario
    const cliente = await carritoService.resolverCliente(idUsuario);

    // 2. Buscar el carrito activo con sus items
    const carrito = await Carrito.findOne({
        where: { idCliente: cliente.idCliente, idEmpresa, estado: 'activo' }
    });

    if (!carrito) {
        return { exito: false, mensaje: 'No tienes un carrito activo para esta empresa' };
    }

    const items = await ItemCarrito.findAll({
        where: { idCarrito: carrito.idCarrito }
    });

    if (items.length === 0) {
        return { exito: false, mensaje: 'Tu carrito está vacío' };
    }

    // 3. Validar stock disponible para todos los items ANTES de reservar
    for (const item of items) {
        const disponible = await carritoService.obtenerStockDisponible(item.idProducto, idEmpresa);
        if (item.cantidad > disponible) {
            const producto = await Producto.findByPk(item.idProducto);
            const nombre = producto ? producto.nombre : item.idProducto;
            return {
                exito: false,
                mensaje: `Stock insuficiente para "${nombre}". Disponible: ${disponible}, en tu pedido: ${item.cantidad}`
            };
        }
    }

    // 4. Crear las reservas (cada una con su propia transacción interna)
    //    Guardamos los ids para poder liberarlas si algo falla después
    const reservasCreadas = [];
    try {
        for (const item of items) {
            const resultadoReserva = await reservaService.crearReserva({
                idEmpresa,
                idProducto: item.idProducto,
                cantidad: item.cantidad,
                referencia: { tipo: 'pedido', id: carrito.idCarrito },
                idUsuario,
                observaciones: `Reserva por pedido del carrito ${carrito.idCarrito}`
            });

            if (!resultadoReserva.exito) {
                // Si una reserva falla, liberamos las ya creadas y abortamos
                await liberarReservasCreadas(reservasCreadas);
                return { exito: false, mensaje: resultadoReserva.mensaje };
            }

            reservasCreadas.push(resultadoReserva.reserva.idReserva);
        }
    } catch (error) {
        await liberarReservasCreadas(reservasCreadas);
        logger.error(`Error al crear reservas para el pedido: ${error.message}`);
        throw error;
    }

    // 5. Con las reservas hechas, crear el pedido en una transacción
    const transaction = await sequelize.transaction();

    try {
        const numeroPedido = await generarNumeroPedido(idEmpresa, transaction);

        // Calcular totales desde el carrito
        const subtotal = parseFloat(carrito.subtotal);
        const descuento = parseFloat(carrito.descuento) || 0;
        const costoDomicilio = datos.costoDomicilio !== undefined
            ? parseFloat(datos.costoDomicilio)
            : parseFloat(carrito.costoDomicilio) || 0;
        const impuestos = datos.impuestos !== undefined ? parseFloat(datos.impuestos) : 0;
        const total = Math.round((subtotal - descuento + costoDomicilio + impuestos) * 100) / 100;

        // Crear el pedido
        const pedido = await Pedido.create({
            idEmpresa,
            idCliente: cliente.idCliente,
            idDireccion: datos.idDireccion || null,
            numeroPedido,
            tipoEntrega: datos.tipoEntrega || 'domicilio',
            tipoPago: datos.tipoPago || 'digital',
            estado: 'pendiente',
            subtotal,
            descuento,
            impuestos,
            costoDomicilio,
            total,
            notas: datos.notas || null,
            direccionEnvio: datos.direccionEnvio || null,
            latitudEntrega: datos.latitudEntrega || null,
            longitudEntrega: datos.longitudEntrega || null,
            fechaPedido: new Date(),
            creadoPor: idUsuario
        }, { transaction });

        // Crear los detalles (una línea por item del carrito)
        for (const item of items) {
            await DetallePedido.create({
                idPedido: pedido.idPedido,
                idProducto: item.idProducto,
                cantidad: item.cantidad,
                precioUnitario: item.precioUnitario,
                descuento: parseFloat(item.descuento) || 0,
                subtotal: item.subtotal,
                notas: item.notas || null
            }, { transaction });
        }
        // Actualizar las reservas para que apunten al pedido (Opción B)
        // Se crearon con referencia al carrito; ahora las vinculamos al pedido real
        const ReservaStock = require('../../models/ReservaStock');
        await ReservaStock.update(
            { referenciaId: pedido.idPedido },
            {
                where: {
                    referenciaTipo: 'pedido',
                    referenciaId: carrito.idCarrito,
                    estado: 'activa'
                },
                transaction
            }
        );

        // Crear el primer registro de seguimiento
        await SeguimientoPedido.create({
            idPedido: pedido.idPedido,
            estado: 'pendiente',
            descripcion: 'Pedido creado y stock reservado',
            registradoPor: idUsuario
        }, { transaction });

        // Marcar el carrito como convertido
        carrito.estado = 'convertido';
        await carrito.save({ transaction });

        await transaction.commit();

        logger.info(`Pedido ${numeroPedido} creado desde carrito ${carrito.idCarrito}`);

        return {
            exito: true,
            pedido: pedido.datosCompletos(),
            mensaje: 'Pedido creado correctamente'
        };
    } catch (error) {
        await transaction.rollback();
        // Si falla la creación del pedido, liberar las reservas para no dejar stock huérfano
        await liberarReservasCreadas(reservasCreadas);
        logger.error(`Error al crear el pedido: ${error.message}`);
        throw error;
    }
};

/**
 * Libera una lista de reservas por sus ids (usado en rollback manual)
 */
const liberarReservasCreadas = async (idsReservas) => {
    for (const idReserva of idsReservas) {
        try {
            await reservaService.liberarReserva(idReserva, 'Rollback: falló la creación del pedido');
        } catch (error) {
            logger.error(`Error al liberar reserva ${idReserva} en rollback: ${error.message}`);
        }
    }
};

// =====================================================
// CONSULTAS DE PEDIDOS
// =====================================================

/**
 * Obtiene un pedido completo con sus detalles y seguimiento
 */
const obtenerPedidoCompleto = async (idPedido, idEmpresa) => {
    const pedido = await Pedido.findOne({
        where: { idPedido, idEmpresa, eliminado: false }
    });

    if (!pedido) {
        return null;
    }

    const detalles = await DetallePedido.findAll({
        where: { idPedido }
    });

    const detallesConProducto = [];
    for (const detalle of detalles) {
        const producto = await Producto.findByPk(detalle.idProducto);
        detallesConProducto.push({
            ...detalle.datosCompletos(),
            producto: producto ? { nombre: producto.nombre } : null
        });
    }

    const seguimiento = await SeguimientoPedido.findAll({
        where: { idPedido },
        order: [['fecha_creacion', 'ASC']]
    });

    return {
        pedido: pedido.datosCompletos(),
        detalles: detallesConProducto,
        seguimiento: seguimiento.map(s => s.datosCompletos())
    };
};

/**
 * Lista los pedidos de una empresa con filtros
 */
const listarPedidos = async (idEmpresa, filtros = {}) => {
    const where = { idEmpresa, eliminado: false };

    if (filtros.estado) {
        where.estado = filtros.estado;
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 20;
    const offset = (pagina - 1) * limit;

    const { count, rows } = await Pedido.findAndCountAll({
        where,
        order: [['fecha_pedido', 'DESC']],
        limit,
        offset
    });

    return {
        pedidos: rows.map(p => p.datosCompletos()),
        paginacion: {
            total: count,
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

/**
 * Lista los pedidos de un cliente (sus compras en todas las empresas)
 */
const listarPedidosCliente = async (idUsuario, filtros = {}) => {
    const cliente = await carritoService.resolverCliente(idUsuario);

    const where = { idCliente: cliente.idCliente, eliminado: false };

    if (filtros.estado) {
        where.estado = filtros.estado;
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 20;
    const offset = (pagina - 1) * limit;

    const { count, rows } = await Pedido.findAndCountAll({
        where,
        order: [['fecha_pedido', 'DESC']],
        limit,
        offset
    });

    return {
        pedidos: rows.map(p => p.datosCompletos()),
        paginacion: {
            total: count,
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

module.exports = {
    generarNumeroPedido,
    crearPedidoDesdeCarrito,
    obtenerPedidoCompleto,
    listarPedidos,
    listarPedidosCliente
};