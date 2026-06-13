const Carrito = require('../../models/Carrito');
const ItemCarrito = require('../../models/ItemCarrito');
const Cliente = require('../../models/Cliente');
const Producto = require('../../models/Producto');
const StockProducto = require('../../models/StockProducto');
const inventarioService = require('./inventarioService');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Carrito de Compras
 *
 * El carrito pertenece a un CLIENTE global. Dado el usuario autenticado,
 * resolvemos (o creamos) su perfil de cliente, que no está atado a empresa.
 * La relación con la empresa vive en el carrito y en los pedidos.
 * El stock solo se valida aquí; se reserva al convertir el carrito en pedido.
 */

/**
 * Resuelve el cliente global vinculado a un usuario.
 * Si no existe, lo crea automáticamente (cliente global, sin empresa).
 */
const resolverCliente = async (idUsuario, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    let cliente = await Cliente.findOne({
        where: { idUsuario, eliminado: false },
        ...opciones
    });

    if (!cliente) {
        cliente = await Cliente.create({
            idUsuario,
            idEmpresa: null,
            activo: true,
            eliminado: false
        }, opciones);
        logger.info(`Perfil de cliente creado automáticamente para usuario ${idUsuario}`);
    }

    return cliente;
};

/**
 * Obtiene el stock disponible de un producto en la empresa
 */
const obtenerStockDisponible = async (idProducto, idEmpresa) => {
    const bodegaPrincipal = await inventarioService.obtenerBodegaPrincipal(idEmpresa);
    if (!bodegaPrincipal) {
        return 0;
    }

    const stock = await StockProducto.findOne({
        where: { idProducto, idBodega: bodegaPrincipal.idBodega }
    });

    return stock ? stock.cantidadDisponible() : 0;
};

/**
 * Obtiene el carrito activo del cliente para una empresa, o lo crea si no existe
 */
const obtenerOCrearCarrito = async (idCliente, idEmpresa, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    let carrito = await Carrito.findOne({
        where: { idCliente, idEmpresa, estado: 'activo' },
        ...opciones
    });

    if (!carrito) {
        carrito = await Carrito.create({
            idCliente,
            idEmpresa,
            estado: 'activo',
            subtotal: 0,
            descuento: 0,
            costoDomicilio: 0,
            total: 0
        }, opciones);
        logger.info(`Carrito creado para cliente ${idCliente} en empresa ${idEmpresa}`);
    }

    return carrito;
};

/**
 * Obtiene el carrito con todos sus items y datos de productos
 */
const obtenerCarritoCompleto = async (idUsuario, idEmpresa) => {
    const cliente = await resolverCliente(idUsuario);

    const carrito = await Carrito.findOne({
        where: { idCliente: cliente.idCliente, idEmpresa, estado: 'activo' }
    });

    if (!carrito) {
        return {
            carrito: null,
            items: [],
            mensaje: 'No tienes un carrito activo'
        };
    }

    const items = await ItemCarrito.findAll({
        where: { idCarrito: carrito.idCarrito },
        order: [['fecha_creacion', 'ASC']]
    });

    const itemsConProducto = [];
    for (const item of items) {
        const producto = await Producto.findByPk(item.idProducto);
        itemsConProducto.push({
            ...item.datosCompletos(),
            producto: producto ? {
                nombre: producto.nombre,
                disponible: producto.activo && !producto.eliminado
            } : null
        });
    }

    return {
        carrito: carrito.datosCompletos(),
        items: itemsConProducto
    };
};

/**
 * Agrega un producto al carrito validando stock disponible
 */
const agregarProducto = async (idUsuario, idEmpresa, datos) => {
    const transaction = await sequelize.transaction();

    try {
        const cliente = await resolverCliente(idUsuario, transaction);

        const producto = await Producto.findOne({
            where: { idProducto: datos.idProducto, idEmpresa, eliminado: false },
            transaction
        });

        if (!producto) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Producto no encontrado' };
        }

        if (!producto.activo) {
            await transaction.rollback();
            return { exito: false, mensaje: 'El producto no está disponible' };
        }

        const cantidadSolicitada = parseInt(datos.cantidad, 10) || 1;

        const disponible = await obtenerStockDisponible(datos.idProducto, idEmpresa);

        const carrito = await obtenerOCrearCarrito(cliente.idCliente, idEmpresa, transaction);

        const itemExistente = await ItemCarrito.findOne({
            where: { idCarrito: carrito.idCarrito, idProducto: datos.idProducto },
            transaction
        });

        const cantidadEnCarrito = itemExistente ? itemExistente.cantidad : 0;
        const cantidadTotal = cantidadEnCarrito + cantidadSolicitada;

        if (cantidadTotal > disponible) {
            await transaction.rollback();
            return {
                exito: false,
                mensaje: `Stock insuficiente. Disponible: ${disponible}, en tu carrito: ${cantidadEnCarrito}, solicitado: ${cantidadSolicitada}`
            };
        }

        if (itemExistente) {
            itemExistente.cantidad = cantidadTotal;
            itemExistente.precioUnitario = producto.precioVenta;
            if (datos.notas !== undefined) {
                itemExistente.notas = datos.notas;
            }
            itemExistente.calcularSubtotal();
            await itemExistente.save({ transaction });
        } else {
            const nuevoItem = ItemCarrito.build({
                idCarrito: carrito.idCarrito,
                idProducto: datos.idProducto,
                cantidad: cantidadSolicitada,
                precioUnitario: producto.precioVenta,
                descuento: 0,
                notas: datos.notas || null
            });
            nuevoItem.calcularSubtotal();
            await nuevoItem.save({ transaction });
        }

        const items = await ItemCarrito.findAll({
            where: { idCarrito: carrito.idCarrito },
            transaction
        });

        carrito.recalcularTotales(items);
        await carrito.save({ transaction });

        await transaction.commit();

        logger.info(`Producto ${datos.idProducto} agregado al carrito ${carrito.idCarrito}`);

        return { exito: true, mensaje: 'Producto agregado al carrito' };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al agregar producto al carrito: ${error.message}`);
        throw error;
    }
};

/**
 * Actualiza la cantidad de un item del carrito
 */
const actualizarCantidad = async (idUsuario, idEmpresa, idItem, nuevaCantidad) => {
    const transaction = await sequelize.transaction();

    try {
        const cliente = await resolverCliente(idUsuario, transaction);

        const carrito = await Carrito.findOne({
            where: { idCliente: cliente.idCliente, idEmpresa, estado: 'activo' },
            transaction
        });

        if (!carrito) {
            await transaction.rollback();
            return { exito: false, mensaje: 'No tienes un carrito activo' };
        }

        const item = await ItemCarrito.findOne({
            where: { idItem, idCarrito: carrito.idCarrito },
            transaction
        });

        if (!item) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Item no encontrado en el carrito' };
        }

        const cantidad = parseInt(nuevaCantidad, 10);

        if (cantidad < 1) {
            await transaction.rollback();
            return { exito: false, mensaje: 'La cantidad debe ser al menos 1. Para quitar el producto, elimínalo del carrito.' };
        }

        const disponible = await obtenerStockDisponible(item.idProducto, idEmpresa);

        if (cantidad > disponible) {
            await transaction.rollback();
            return { exito: false, mensaje: `Stock insuficiente. Disponible: ${disponible}, solicitado: ${cantidad}` };
        }

        item.cantidad = cantidad;
        item.calcularSubtotal();
        await item.save({ transaction });

        const items = await ItemCarrito.findAll({
            where: { idCarrito: carrito.idCarrito },
            transaction
        });

        carrito.recalcularTotales(items);
        await carrito.save({ transaction });

        await transaction.commit();

        return { exito: true, mensaje: 'Cantidad actualizada' };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al actualizar cantidad: ${error.message}`);
        throw error;
    }
};

/**
 * Quita un item del carrito
 */
const quitarItem = async (idUsuario, idEmpresa, idItem) => {
    const transaction = await sequelize.transaction();

    try {
        const cliente = await resolverCliente(idUsuario, transaction);

        const carrito = await Carrito.findOne({
            where: { idCliente: cliente.idCliente, idEmpresa, estado: 'activo' },
            transaction
        });

        if (!carrito) {
            await transaction.rollback();
            return { exito: false, mensaje: 'No tienes un carrito activo' };
        }

        const item = await ItemCarrito.findOne({
            where: { idItem, idCarrito: carrito.idCarrito },
            transaction
        });

        if (!item) {
            await transaction.rollback();
            return { exito: false, mensaje: 'Item no encontrado en el carrito' };
        }

        await item.destroy({ transaction });

        const items = await ItemCarrito.findAll({
            where: { idCarrito: carrito.idCarrito },
            transaction
        });

        carrito.recalcularTotales(items);
        await carrito.save({ transaction });

        await transaction.commit();

        return { exito: true, mensaje: 'Producto quitado del carrito' };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al quitar item: ${error.message}`);
        throw error;
    }
};

/**
 * Vacía completamente el carrito
 */
const vaciarCarrito = async (idUsuario, idEmpresa) => {
    const transaction = await sequelize.transaction();

    try {
        const cliente = await resolverCliente(idUsuario, transaction);

        const carrito = await Carrito.findOne({
            where: { idCliente: cliente.idCliente, idEmpresa, estado: 'activo' },
            transaction
        });

        if (!carrito) {
            await transaction.rollback();
            return { exito: false, mensaje: 'No tienes un carrito activo' };
        }

        await ItemCarrito.destroy({
            where: { idCarrito: carrito.idCarrito },
            transaction
        });

        carrito.subtotal = 0;
        carrito.descuento = 0;
        carrito.total = 0;
        await carrito.save({ transaction });

        await transaction.commit();

        return { exito: true, mensaje: 'Carrito vaciado' };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al vaciar carrito: ${error.message}`);
        throw error;
    }
};

module.exports = {
    resolverCliente,
    obtenerStockDisponible,
    obtenerOCrearCarrito,
    obtenerCarritoCompleto,
    agregarProducto,
    actualizarCantidad,
    quitarItem,
    vaciarCarrito
};