const Pedido = require('../../models/Pedido');
const DetallePedido = require('../../models/DetallePedido');
const SeguimientoPedido = require('../../models/SeguimientoPedido');
const Carrito = require('../../models/Carrito');
const ItemCarrito = require('../../models/ItemCarrito');
const Producto = require('../../models/Producto');
const Cliente = require('../../models/Cliente');
const reservaService = require('./reservaService');
const carritoService = require('./carritoService');
const notificacionEventos = require('./notificacionEventos');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Pedidos
 *
 * Maneja la conversión de carrito a pedido, que es el corazón de la venta.
 * Al crear un pedido se reserva el stock (Fase 7). El stock se consume de
 * verdad al entregar (Bloque 3). La relación cliente-empresa vive aquí.
 *
 * Notificaciones:
 *  - Al crear el pedido, se notifica al negocio (administrador de la empresa)
 *    del nuevo pedido entrante (fire-and-forget, tras el commit).
 *
 * Blindaje numérico y de ENUMs:
 *  - Todos los campos numéricos que van al modelo Pedido pasan por
 *    numeroSeguro(), que NUNCA devuelve NaN/null/undefined.
 *  - tipoEntrega y tipoPago se validan contra listas blancas idénticas
 *    a los ENUM del modelo.
 *
 * Blindaje de numeroPedido:
 *  - generarNumeroPedido() usa COUNT(), que NO es seguro bajo concurrencia
 *    (dos requests casi simultáneos pueden generar el mismo correlativo).
 *  - Por eso la creación del pedido está envuelta en un retry: si MySQL
 *    rechaza el INSERT por duplicado en numero_pedido, se regenera el
 *    número y se reintenta, sin tocar las reservas de stock ya creadas.
 */

// =====================================================
// LISTAS BLANCAS (deben coincidir 1:1 con los ENUM del modelo Pedido)
// =====================================================

const TIPOS_ENTREGA_VALIDOS = ['domicilio', 'recogida', 'en_sitio'];
const TIPOS_PAGO_VALIDOS = ['digital', 'contra_entrega', 'mixto'];

const MAX_INTENTOS_NUMERO_PEDIDO = 3;

// =====================================================
// HELPERS DE SANEAMIENTO
// =====================================================

const numeroSeguro = (valor, porDefecto, nombreCampo) => {
    const parseado = parseFloat(valor);
    if (Number.isFinite(parseado)) {
        return parseado;
    }
    logger.warn(
        `[pedidoService] Valor numérico inválido para "${nombreCampo}": ` +
        `${JSON.stringify(valor)} (tipo: ${typeof valor}). Usando valor por defecto ${porDefecto}.`
    );
    return porDefecto;
};

const enumSeguro = (valor, valoresValidos, porDefecto, nombreCampo) => {
    if (valoresValidos.includes(valor)) {
        return valor;
    }
    logger.warn(
        `[pedidoService] Valor de ENUM inválido para "${nombreCampo}": ` +
        `${JSON.stringify(valor)}. Valores permitidos: [${valoresValidos.join(', ')}]. ` +
        `Usando valor por defecto "${porDefecto}".`
    );
    return porDefecto;
};

/**
 * Registra el detalle real de un error de Sequelize (Validation o Unique
 * Constraint) en el log. Ambos tipos exponen error.errors[], por eso NO
 * filtramos por error.name -- filtrar por nombre fue lo que hizo que el
 * primer intento de logging detallado no se disparara para un
 * SequelizeUniqueConstraintError.
 */
const logDetalleErrorSequelize = (error, contexto) => {
    if (Array.isArray(error.errors) && error.errors.length > 0) {
        const detalle = error.errors
            .map(e => `campo="${e.path}" valor=${JSON.stringify(e.value)} tipo="${e.type || e.validatorKey}" razon="${e.message}"`)
            .join(' | ');
        logger.error(`${contexto}: ${detalle}`);
    } else {
        logger.error(`${contexto}: ${error.message}`);
    }
};

/**
 * Determina si un error de Sequelize es específicamente una colisión
 * de numero_pedido (constraint único), y por lo tanto es seguro reintentar
 * regenerando el número.
 */
const esColisionNumeroPedido = (error) => {
    if (error.name !== 'SequelizeUniqueConstraintError') {
        return false;
    }
    const campos = (error.fields && Object.keys(error.fields)) || [];
    const enErrors = Array.isArray(error.errors) && error.errors.some(e => e.path === 'numeroPedido' || e.path === 'numero_pedido');
    return campos.includes('numero_pedido') || enErrors;
};

// =====================================================
// GENERACIÓN DE NÚMERO DE PEDIDO
// =====================================================

/**
 * Genera un número de pedido único y legible para la empresa
 * Formato: PED-AÑO-NNNNN (ej: PED-2026-00042)
 *
 * NOTA: usa COUNT(), que no es 100% seguro bajo concurrencia alta.
 * La protección real contra colisiones está en el retry de
 * crearPedidoDesdeCarrito, que regenera el número si el INSERT falla
 * por duplicado.
 */
const generarNumeroPedido = async (idEmpresa, transaction) => {
    const anio = new Date().getFullYear();
    const prefijo = `PED-${anio}-`;

    // FOR UPDATE bloquea la fila del último pedido de ESTA empresa para
    // este año, evitando que dos transacciones concurrentes lean el mismo
    // correlativo antes de que la primera haga commit. Ya no depende de
    // COUNT(), que no daba esa garantía bajo concurrencia.
    const resultados = await sequelize.query(
        `SELECT numero_pedido FROM pedidos
         WHERE id_empresa = :idEmpresa AND numero_pedido LIKE :prefijoLike
         ORDER BY numero_pedido DESC
         LIMIT 1
         FOR UPDATE`,
        {
            replacements: { idEmpresa, prefijoLike: `${prefijo}%` },
            transaction,
            type: sequelize.QueryTypes.SELECT
        }
    );

    let siguienteCorrelativo = 1;
    if (resultados.length > 0 && resultados[0].numero_pedido) {
        const partes = resultados[0].numero_pedido.split('-');
        const ultimoCorrelativo = parseInt(partes[2], 10);
        if (Number.isFinite(ultimoCorrelativo)) {
            siguienteCorrelativo = ultimoCorrelativo + 1;
        }
    }

    const correlativo = String(siguienteCorrelativo).padStart(5, '0');
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

    // 5. Con las reservas hechas, crear el pedido en una transacción,
    //    con retry si la colisión es específicamente en numero_pedido.
    let ultimoError = null;

    for (let intento = 1; intento <= MAX_INTENTOS_NUMERO_PEDIDO; intento++) {
        const transaction = await sequelize.transaction();

        try {
            const numeroPedido = await generarNumeroPedido(idEmpresa, transaction);

            // --- Saneamiento de tipoEntrega / tipoPago ---
            const tipoEntrega = enumSeguro(datos.tipoEntrega, TIPOS_ENTREGA_VALIDOS, 'domicilio', 'tipoEntrega');
            const tipoPago = enumSeguro(datos.tipoPago, TIPOS_PAGO_VALIDOS, 'digital', 'tipoPago');

            // --- Saneamiento numérico ---
            const subtotal = numeroSeguro(carrito.subtotal, 0, 'subtotal (carrito.subtotal)');
            const descuento = numeroSeguro(carrito.descuento, 0, 'descuento (carrito.descuento)');

            const costoDomicilioBody = datos.costoDomicilio !== undefined
                ? numeroSeguro(datos.costoDomicilio, null, 'costoDomicilio (body)')
                : null;
            const costoDomicilio = costoDomicilioBody !== null
                ? costoDomicilioBody
                : numeroSeguro(carrito.costoDomicilio, 0, 'costoDomicilio (carrito.costoDomicilio)');

            const impuestos = datos.impuestos !== undefined
                ? numeroSeguro(datos.impuestos, 0, 'impuestos (body)')
                : 0;

            const total = Math.round((subtotal - descuento + costoDomicilio + impuestos) * 100) / 100;

            // Crear el pedido
            const pedido = await Pedido.create({
                idEmpresa,
                idCliente: cliente.idCliente,
                idDireccion: datos.idDireccion || null,
                numeroPedido,
                tipoEntrega,
                tipoPago,
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
                    descuento: numeroSeguro(`item.descuento, 0, detalle.descuento (producto ${item.idProducto})`),
                    subtotal: item.subtotal,
                    notas: item.notas || null
                }, { transaction });
            }

            // Actualizar las reservas para que apunten al pedido (Opción B)
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

            logger.info(`Pedido ${numeroPedido} creado desde carrito ${carrito.idCarrito} (intento ${intento})`);

            // Notificar al negocio del nuevo pedido entrante (fire-and-forget, tras el commit)
            await notificacionEventos.notificarNuevoPedido(pedido);

            return {
                exito: true,
                pedido: pedido.datosCompletos(),
                mensaje: 'Pedido creado correctamente'
            };
        } catch (error) {
            await transaction.rollback();
            ultimoError = error;

            if (esColisionNumeroPedido(error) && intento < MAX_INTENTOS_NUMERO_PEDIDO) {
                logger.warn(
                    `[pedidoService] Colisión de numeroPedido en intento ${intento}/${MAX_INTENTOS_NUMERO_PEDIDO}. ` +
                    `Reintentando con un nuevo número (no se tocan las reservas de stock).`
                );
                continue; // reintenta el for con un nuevo número, mismas reservas
            }

            // Error no recuperable (o se agotaron los reintentos):
            // liberar reservas y reportar el detalle completo.
            await liberarReservasCreadas(reservasCreadas);
            logDetalleErrorSequelize(error, 'Error al crear el pedido');
            throw error;
        }
    }

    // No debería llegarse aquí, pero por seguridad:
    await liberarReservasCreadas(reservasCreadas);
    throw ultimoError;
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