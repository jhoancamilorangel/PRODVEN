const ReservaStock = require('../models/ReservaStock');
const Producto = require('../models/Producto');
const reservaService = require('../services/private/reservaService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * POST /api/reservas
 * Crea una reserva de stock para un producto
 * Acceso: Admin, Vendedor (las reservas se crean al armar pedidos)
 */
const crearReserva = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: {
                idProducto: req.body.idProducto,
                idEmpresa: req.tenantId,
                eliminado: false
            }
        });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const resultado = await reservaService.crearReserva({
            ...req.body,
            idEmpresa: req.tenantId,
            idUsuario: req.userId
        });

        if (!resultado.exito) {
            return sendResponse(res, 409, false, resultado.mensaje, {
                disponible: resultado.disponible
            });
        }

        return sendResponse(res, 201, true, resultado.mensaje, {
            reserva: resultado.reserva.resumen()
        });
    } catch (error) {
        logger.error(`Error al crear reserva: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/reservas
 * Lista las reservas de la empresa con filtros
 * Acceso: Admin, Supervisor
 */
const listarReservas = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req);
        const paginacion = construirPaginacion(req.query);

        if (req.query.estado) {
            filtros.estado = req.query.estado;
        }

        if (req.query.idProducto) {
            filtros.idProducto = req.query.idProducto;
        }

        if (req.query.referenciaTipo) {
            filtros.referenciaTipo = req.query.referenciaTipo;
        }

        if (req.query.referenciaId) {
            filtros.referenciaId = req.query.referenciaId;
        }

        const { count, rows } = await ReservaStock.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_creacion', 'DESC']]
        });

        return sendResponse(res, 200, true, 'Reservas obtenidas', {
            reservas: rows.map(r => r.resumen()),
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar reservas: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/reservas/activas/:idProducto
 * Lista las reservas activas de un producto específico
 */
const listarReservasActivasProducto = async (req, res, next) => {
    try {
        const producto = await Producto.findOne({
            where: {
                idProducto: req.params.idProducto,
                idEmpresa: req.tenantId,
                eliminado: false
            }
        });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const reservas = await reservaService.listarReservasActivasProducto(req.params.idProducto);
        const totalReservado = await reservaService.obtenerTotalReservado(req.params.idProducto);

        return sendResponse(res, 200, true, 'Reservas activas obtenidas', {
            producto: {
                idProducto: producto.idProducto,
                nombre: producto.nombre,
                codigoSku: producto.codigoSku
            },
            totalReservado,
            cantidadReservas: reservas.length,
            reservas: reservas.map(r => r.resumen())
        });
    } catch (error) {
        logger.error(`Error al listar reservas del producto: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/reservas/:id
 * Obtiene una reserva específica
 */
const obtenerReserva = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idReserva: req.params.id
        });

        const reserva = await ReservaStock.findOne({ where: filtros });

        if (!reserva) {
            return sendResponse(res, 404, false, 'Reserva no encontrada');
        }

        return sendResponse(res, 200, true, 'Reserva obtenida', reserva.resumen());
    } catch (error) {
        logger.error(`Error al obtener reserva: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/reservas/:id/confirmar
 * Confirma una reserva convirtiéndola en salida real de inventario
 * Acceso: Admin, Vendedor
 */
const confirmarReserva = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idReserva: req.params.id
        });

        const reserva = await ReservaStock.findOne({ where: filtros });

        if (!reserva) {
            return sendResponse(res, 404, false, 'Reserva no encontrada');
        }

        if (reserva.estado !== 'activa') {
            return sendResponse(res, 409, false,
                `No se puede confirmar una reserva en estado: ${reserva.estado}`
            );
        }

        const resultado = await reservaService.confirmarReserva(req.params.id, {
            motivo: req.body.motivo,
            idUsuario: req.userId,
            documentoSoporte: req.body.documentoSoporte
        });

        return sendResponse(res, 200, true, 'Reserva confirmada como salida de venta', {
            reserva: resultado.reserva.resumen(),
            movimiento: {
                idMovimiento: resultado.movimiento.idMovimiento,
                tipo: resultado.movimiento.tipo,
                cantidad: parseFloat(resultado.movimiento.cantidad)
            }
        });
    } catch (error) {
        logger.error(`Error al confirmar reserva: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/reservas/:id/liberar
 * Libera una reserva devolviendo el stock al disponible
 * Acceso: Admin, Vendedor
 */
const liberarReserva = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idReserva: req.params.id
        });

        const reserva = await ReservaStock.findOne({ where: filtros });

        if (!reserva) {
            return sendResponse(res, 404, false, 'Reserva no encontrada');
        }

        if (reserva.estado !== 'activa') {
            return sendResponse(res, 409, false,
                `No se puede liberar una reserva en estado: ${reserva.estado}`
            );
        }

        const reservaLiberada = await reservaService.liberarReserva(
            req.params.id,
            req.body.motivo || 'Liberación manual desde administración'
        );

        return sendResponse(res, 200, true, 'Reserva liberada correctamente', {
            reserva: reservaLiberada.resumen()
        });
    } catch (error) {
        logger.error(`Error al liberar reserva: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/reservas/procesar-expiradas
 * Ejecuta el proceso de expiración automática de reservas
 * Acceso: Solo Admin (manual) o sistema (job programado en el futuro)
 */
const procesarExpiradas = async (req, res, next) => {
    try {
        const resultado = await reservaService.procesarReservasExpiradas();

        const mensaje = resultado.expiradas === 0
            ? 'No hay reservas para expirar en este momento'
            : `Se expiraron ${resultado.expiradas} reserva(s)`;

        return sendResponse(res, 200, true, mensaje, resultado);
    } catch (error) {
        logger.error(`Error al procesar expiradas: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearReserva,
    listarReservas,
    listarReservasActivasProducto,
    obtenerReserva,
    confirmarReserva,
    liberarReserva,
    procesarExpiradas
};