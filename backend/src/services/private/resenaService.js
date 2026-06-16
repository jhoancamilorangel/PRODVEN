const Resena = require('../../models/Resena');
const Pedido = require('../../models/Pedido');
const DetallePedido = require('../../models/DetallePedido');
const Cliente = require('../../models/Cliente');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');
const { Op } = require('sequelize');

/**
 * Servicio de Reseñas
 *
 * Resuelve el usuario autenticado a su perfil de cliente global con una
 * función propia (resolverCliente), para no depender de otros servicios
 * y evitar dependencias circulares.
 *
 * IMPORTANTE: El promedio de calificación lo calculan AUTOMÁTICAMENTE los
 * triggers de la base de datos. Este servicio NO calcula promedios.
 */

/**
 * Resuelve el cliente global vinculado a un usuario.
 * Si no existe, lo crea (igual que en el carrito, para coherencia).
 */
const resolverCliente = async (idUsuario) => {
    let cliente = await Cliente.findOne({
        where: { idUsuario, eliminado: false }
    });

    if (!cliente) {
        cliente = await Cliente.create({
            idUsuario,
            idEmpresa: null,
            activo: true,
            eliminado: false
        });
        logger.info(`Perfil de cliente creado automáticamente para usuario ${idUsuario}`);
    }

    return cliente;
};

// =====================================================
// VALIDACIÓN DE COMPRA
// =====================================================

const buscarPedidoQueRespalda = async (idCliente, idProducto, idEmpresa) => {
    const pedidosEntregados = await Pedido.findAll({
        where: {
            idCliente,
            idEmpresa,
            estado: 'entregado',
            eliminado: false
        },
        attributes: ['idPedido']
    });

    if (pedidosEntregados.length === 0) {
        return null;
    }

    const idsPedidos = pedidosEntregados.map(p => p.idPedido);

    const detalle = await DetallePedido.findOne({
        where: {
            idPedido: { [Op.in]: idsPedidos },
            idProducto
        }
    });

    if (!detalle) {
        return null;
    }

    return { idPedido: detalle.idPedido };
};

// =====================================================
// CREAR RESEÑA
// =====================================================

const crearResena = async (idEmpresa, idUsuario, datos) => {
    const { idProducto, calificacion, titulo, comentario } = datos;

    // Resolver el cliente global a partir del usuario autenticado
    const cliente = await resolverCliente(idUsuario);
    const idCliente = cliente.idCliente;

    let idPedidoRespaldo = null;

    if (idProducto) {
        const resenaExistente = await Resena.findOne({
            where: {
                idCliente,
                idProducto,
                eliminado: false
            }
        });

        if (resenaExistente) {
            return {
                exito: false,
                mensaje: 'Ya has reseñado este producto. Puedes editar tu reseña existente.',
                yaResenado: true
            };
        }

        const respaldo = await buscarPedidoQueRespalda(idCliente, idProducto, idEmpresa);

        if (!respaldo) {
            return {
                exito: false,
                mensaje: 'Solo puedes reseñar productos que hayas comprado y recibido'
            };
        }

        idPedidoRespaldo = respaldo.idPedido;
    }

    const resena = await Resena.create({
        idEmpresa,
        idProducto: idProducto || null,
        idCliente,
        idPedido: idPedidoRespaldo,
        calificacion,
        titulo: titulo || null,
        comentario: comentario || null,
        visible: true
    });

    logger.info(`Reseña creada: ${resena.idResena} por cliente ${idCliente}`);

    return {
        exito: true,
        resena: resena.datosCompletos(),
        mensaje: 'Reseña publicada'
    };
};

// =====================================================
// LISTAR RESEÑAS
// =====================================================

const listarResenasProducto = async (idProducto, filtros = {}) => {
    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = parseInt(filtros.limit, 10) || 20;
    const offset = (pagina - 1) * limit;

    const { count, rows } = await Resena.findAndCountAll({
        where: {
            idProducto,
            visible: true,
            eliminado: false
        },
        order: [['fecha_creacion', 'DESC']],
        limit,
        offset
    });

    return {
        resenas: rows.map(r => r.datosCompletos()),
        paginacion: {
            total: count,
            pagina,
            limit,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

const listarResenasCliente = async (idUsuario) => {
    const cliente = await resolverCliente(idUsuario);

    const resenas = await Resena.findAll({
        where: { idCliente: cliente.idCliente, eliminado: false },
        order: [['fecha_creacion', 'DESC']]
    });

    return { resenas: resenas.map(r => r.datosCompletos()) };
};

// =====================================================
// EDITAR Y ELIMINAR
// =====================================================

const editarResena = async (idResena, idUsuario, datos) => {
    const cliente = await resolverCliente(idUsuario);

    const resena = await Resena.findOne({
        where: { idResena, idCliente: cliente.idCliente, eliminado: false }
    });

    if (!resena) {
        return { exito: false, mensaje: 'Reseña no encontrada o no es tuya' };
    }

    if (datos.calificacion !== undefined) resena.calificacion = datos.calificacion;
    if (datos.titulo !== undefined) resena.titulo = datos.titulo;
    if (datos.comentario !== undefined) resena.comentario = datos.comentario;

    await resena.save();

    return { exito: true, resena: resena.datosCompletos(), mensaje: 'Reseña actualizada' };
};

const eliminarResena = async (idResena, idUsuario) => {
    const cliente = await resolverCliente(idUsuario);

    const resena = await Resena.findOne({
        where: { idResena, idCliente: cliente.idCliente, eliminado: false }
    });

    if (!resena) {
        return { exito: false, mensaje: 'Reseña no encontrada o no es tuya' };
    }

    resena.eliminado = true;
    await resena.save();

    return { exito: true, mensaje: 'Reseña eliminada' };
};

// =====================================================
// MODERACIÓN (por la empresa)
// =====================================================

const cambiarVisibilidad = async (idResena, idEmpresa, visible) => {
    const resena = await Resena.findOne({
        where: { idResena, idEmpresa, eliminado: false }
    });

    if (!resena) {
        return { exito: false, mensaje: 'Reseña no encontrada' };
    }

    resena.visible = visible;
    await resena.save();

    const estado = visible ? 'visible' : 'oculta';
    return { exito: true, mensaje: `Reseña marcada como ${estado}` };
};

module.exports = {
    crearResena,
    listarResenasProducto,
    listarResenasCliente,
    editarResena,
    eliminarResena,
    cambiarVisibilidad
};