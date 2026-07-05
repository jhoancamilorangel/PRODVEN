const notificacionService = require('./notificacionService');
const Cliente = require('../../models/Cliente');
const Usuario = require('../../models/Usuario');
const logger = require('../../config/logger');

/**
 * Capa de Eventos de Notificación
 *
 * Puente entre los eventos de negocio (pedidos, pagos, onboarding) y la
 * creación de notificaciones dentro de la app. Centraliza AQUÍ toda la
 * lógica de "cuándo y a quién notificar", para que los services de negocio
 * solo llamen a una función clara sin ensuciarse con detalles de notificación.
 *
 * Todas las funciones son "fire-and-forget": si algo falla, se registra
 * en el log pero NUNCA se lanza el error, para no tumbar la operación
 * principal por un fallo secundario de notificación.
 *
 * Resolución de destinatarios:
 *  - Cliente:  pedido.idCliente -> Cliente.idUsuario  (a quién le llega su compra)
 *  - Negocio:  pedido.idEmpresa -> Usuario con rol 'administrador' de esa empresa
 */

// =====================================================
// HELPERS DE RESOLUCIÓN DE DESTINATARIO
// =====================================================

/**
 * Dado el idCliente de un pedido, devuelve el idUsuario del cliente
 * (el destinatario real de la notificación en la tabla notificaciones).
 */
const obtenerUsuarioDeCliente = async (idCliente) => {
    if (!idCliente) return null;
    const cliente = await Cliente.findByPk(idCliente);
    return cliente ? cliente.idUsuario : null;
};

/**
 * Dado el idEmpresa de un pedido, devuelve el idUsuario del administrador
 * de esa empresa (a quién avisamos de los pedidos entrantes).
 */
const obtenerAdministradorDeEmpresa = async (idEmpresa) => {
    if (!idEmpresa) return null;
    const admin = await Usuario.findOne({
        where: { idEmpresa, rol: 'administrador', activo: true, eliminado: false }
    });
    return admin ? admin.idUsuario : null;
};

// =====================================================
// EVENTOS DE PEDIDO (hacia el CLIENTE)
// =====================================================

/**
 * Notifica al CLIENTE que su pedido cambió de estado.
 * Se llama desde gestionPedidoService tras confirmar el cambio.
 *
 * @param {object} pedido - Instancia del modelo Pedido (ya guardado)
 * @param {string} estadoLegible - Texto legible del nuevo estado (etiquetaEstado)
 */
const notificarCambioEstadoPedido = async (pedido, estadoLegible) => {
    try {
        const idUsuario = await obtenerUsuarioDeCliente(pedido.idCliente);
        if (!idUsuario) {
            logger.warn(`No se pudo notificar cambio de estado: cliente ${pedido.idCliente} sin usuario`);
            return;
        }

        // Mensajes específicos según el estado, con un fallback genérico
        const mensajes = {
            confirmado: 'Tu pedido fue confirmado y pronto empezará a prepararse.',
            en_preparacion: 'Tu pedido se está preparando.',
            en_camino: '¡Tu pedido va en camino!',
            entregado: 'Tu pedido fue entregado. ¡Gracias por tu compra!',
            cancelado: 'Tu pedido fue cancelado.',
            reembolsado: 'Tu pedido fue reembolsado.'
        };

        await notificacionService.crearNotificacion({
            idUsuario,
            idEmpresa: pedido.idEmpresa,
            titulo: `Pedido ${pedido.numeroPedido}: ${estadoLegible}`,
            mensaje: mensajes[pedido.estado] || `Tu pedido ahora está: ${estadoLegible}.`,
            tipo: 'pedido',
            urlAccion: '/mis-compras'
        });
    } catch (error) {
        logger.error(`Error en notificarCambioEstadoPedido: ${error.message}`);
    }
};

// =====================================================
// EVENTOS DE PAGO (hacia el CLIENTE)
// =====================================================

/**
 * Notifica al CLIENTE que su pago se registró correctamente.
 * Se llama desde pagoService.aplicarPagoExitoso (solo pagos de pedido).
 *
 * @param {object} pago - Instancia del modelo Pago (completado)
 * @param {object} pedido - Instancia del modelo Pedido asociado
 */
const notificarPagoExitoso = async (pago, pedido) => {
    try {
        if (!pedido) return;

        const idUsuario = await obtenerUsuarioDeCliente(pedido.idCliente);
        if (!idUsuario) {
            logger.warn(`No se pudo notificar pago exitoso: cliente ${pedido.idCliente} sin usuario`);
            return;
        }

        await notificacionService.crearNotificacion({
            idUsuario,
            idEmpresa: pedido.idEmpresa,
            titulo: 'Pago confirmado',
            mensaje: `Recibimos tu pago del pedido ${pedido.numeroPedido}. ¡Gracias!`,
            tipo: 'pago',
            urlAccion: '/mis-compras'
        });
    } catch (error) {
        logger.error(`Error en notificarPagoExitoso: ${error.message}`);
    }
};

// =====================================================
// EVENTOS DE PEDIDO (hacia el NEGOCIO)
// =====================================================

/**
 * Notifica al NEGOCIO (administrador de la empresa) que entró un pedido nuevo.
 * Se llama desde pedidoService.crearPedidoDesdeCarrito tras el commit.
 *
 * @param {object} pedido - Instancia del modelo Pedido recién creado
 */
const notificarNuevoPedido = async (pedido) => {
    try {
        const idUsuario = await obtenerAdministradorDeEmpresa(pedido.idEmpresa);
        if (!idUsuario) {
            logger.warn(`No se pudo notificar nuevo pedido: empresa ${pedido.idEmpresa} sin administrador`);
            return;
        }

        await notificacionService.crearNotificacion({
            idUsuario,
            idEmpresa: pedido.idEmpresa,
            titulo: 'Nuevo pedido recibido',
            mensaje: `Tienes un nuevo pedido ${pedido.numeroPedido} por un total de $${Number(pedido.total).toLocaleString('es-CO')}.`,
            tipo: 'pedido',
            urlAccion: '/pedidos'
        });
    } catch (error) {
        logger.error(`Error en notificarNuevoPedido: ${error.message}`);
    }
};

// =====================================================
// EVENTOS DE ONBOARDING (hacia el USUARIO solicitante)
// =====================================================

/**
 * Notifica al usuario que su solicitud de negocio fue APROBADA.
 * Se llama desde solicitudNegocioService.aprobarSolicitud.
 *
 * @param {string} idUsuario - Usuario solicitante (ya promovido a administrador)
 * @param {string} nombreNegocio - Nombre del negocio aprobado
 */
const notificarSolicitudAprobada = async (idUsuario, nombreNegocio) => {
    try {
        if (!idUsuario) return;

        await notificacionService.crearNotificacion({
            idUsuario,
            idEmpresa: null,
            titulo: '¡Tu negocio fue aprobado!',
            mensaje: `Tu solicitud para "${nombreNegocio}" fue aprobada. Inicia sesión de nuevo para entrar a tu panel de negocio.`,
            tipo: 'sistema',
            urlAccion: '/dashboard'
        });
    } catch (error) {
        logger.error(`Error en notificarSolicitudAprobada: ${error.message}`);
    }
};

/**
 * Notifica al usuario que su solicitud de negocio fue RECHAZADA.
 * Se llama desde solicitudNegocioService.rechazarSolicitud.
 *
 * @param {string} idUsuario - Usuario solicitante (sigue siendo cliente)
 * @param {string} motivo - Razón del rechazo
 */
const notificarSolicitudRechazada = async (idUsuario, motivo) => {
    try {
        if (!idUsuario) return;

        await notificacionService.crearNotificacion({
            idUsuario,
            idEmpresa: null,
            titulo: 'Sobre tu solicitud de negocio',
            mensaje: `Tu solicitud no fue aprobada esta vez. Motivo: ${motivo}`,
            tipo: 'sistema',
            urlAccion: null
        });
    } catch (error) {
        logger.error(`Error en notificarSolicitudRechazada: ${error.message}`);
    }
};

module.exports = {
    notificarCambioEstadoPedido,
    notificarPagoExitoso,
    notificarNuevoPedido,
    notificarSolicitudAprobada,
    notificarSolicitudRechazada
};