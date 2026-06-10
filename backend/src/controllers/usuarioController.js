const Usuario = require('../models/Usuario');
const usuarioService = require('../services/private/usuarioService');
const {
    construirFiltroTenant,
    construirPaginacion,
    construirMetadataPaginacion
} = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Formatea un usuario para la respuesta, ocultando datos sensibles
 */
const formatearUsuario = (usuario) => {
    return {
        idUsuario: usuario.idUsuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        telefono: usuario.telefono,
        avatarUrl: usuario.avatarUrl,
        rol: usuario.rol,
        activo: usuario.activo,
        verificado: usuario.verificado,
        debeChangarPassword: usuario.debeChangarPassword,
        ultimoAcceso: usuario.ultimoAcceso,
        fechaCreacion: usuario.fecha_creacion
    };
};

/**
 * GET /api/usuarios
 * Lista los usuarios del equipo de la empresa
 */
const listarUsuarios = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, { eliminado: false });
        const paginacion = construirPaginacion(req.query);

        if (req.query.rol) {
            filtros.rol = req.query.rol;
        }

        if (req.query.activo !== undefined) {
            filtros.activo = req.query.activo === 'true';
        }

        const { count, rows } = await Usuario.findAndCountAll({
            where: filtros,
            limit: paginacion.limit,
            offset: paginacion.offset,
            order: [['fecha_creacion', 'DESC']]
        });

        return sendResponse(res, 200, true, 'Usuarios obtenidos', {
            usuarios: rows.map(formatearUsuario),
            paginacion: construirMetadataPaginacion(count, paginacion)
        });
    } catch (error) {
        logger.error(`Error al listar usuarios: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/usuarios/:id
 * Obtiene un usuario específico del equipo
 */
const obtenerUsuario = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idUsuario: req.params.id,
            eliminado: false
        });

        const usuario = await Usuario.findOne({ where: filtros });

        if (!usuario) {
            return sendResponse(res, 404, false, 'Usuario no encontrado');
        }

        return sendResponse(res, 200, true, 'Usuario obtenido', formatearUsuario(usuario));
    } catch (error) {
        logger.error(`Error al obtener usuario: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/usuarios
 * Crea un nuevo usuario en el equipo de la empresa
 */
const crearUsuario = async (req, res, next) => {
    try {
        const resultado = await usuarioService.crearUsuario(req.body, req.tenantId, req.userId);

        if (!resultado.exito) {
            return sendResponse(res, 409, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, formatearUsuario(resultado.usuario));
    } catch (error) {
        logger.error(`Error al crear usuario: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/usuarios/:id
 * Actualiza los datos de un usuario del equipo
 */
const actualizarUsuario = async (req, res, next) => {
    try {
        // Protección: un admin no puede cambiarse el rol a sí mismo
        if (req.params.id === req.userId && req.body.rol) {
            return sendResponse(res, 409, false, 'No puedes cambiar tu propio rol');
        }

        const resultado = await usuarioService.actualizarUsuario(req.params.id, req.body, req.tenantId);

        if (!resultado.exito) {
            const status = resultado.mensaje.includes('no encontrado') ? 404 : 409;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, formatearUsuario(resultado.usuario));
    } catch (error) {
        logger.error(`Error al actualizar usuario: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/usuarios/:id
 * Elimina lógicamente un usuario del equipo
 */
const eliminarUsuario = async (req, res, next) => {
    try {
        // Protección: un admin no puede eliminarse a sí mismo
        if (req.params.id === req.userId) {
            return sendResponse(res, 409, false, 'No puedes eliminar tu propia cuenta');
        }

        const resultado = await usuarioService.eliminarUsuario(req.params.id, req.tenantId);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al eliminar usuario: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/usuarios/:id/activar
 * Activa un usuario del equipo
 */
const activarUsuario = async (req, res, next) => {
    try {
        const resultado = await usuarioService.cambiarEstadoActivo(req.params.id, true, req.tenantId);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, formatearUsuario(resultado.usuario));
    } catch (error) {
        logger.error(`Error al activar usuario: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/usuarios/:id/desactivar
 * Desactiva un usuario del equipo
 */
const desactivarUsuario = async (req, res, next) => {
    try {
        // Protección: un admin no puede desactivarse a sí mismo
        if (req.params.id === req.userId) {
            return sendResponse(res, 409, false, 'No puedes desactivar tu propia cuenta');
        }

        const resultado = await usuarioService.cambiarEstadoActivo(req.params.id, false, req.tenantId);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, formatearUsuario(resultado.usuario));
    } catch (error) {
        logger.error(`Error al desactivar usuario: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/usuarios/:id/resetear-password
 * Resetea la contraseña de un usuario generando una temporal
 */
const resetearPassword = async (req, res, next) => {
    try {
        const resultado = await usuarioService.resetearPassword(req.params.id, req.tenantId);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, {
            passwordTemporal: resultado.passwordTemporal
        });
    } catch (error) {
        logger.error(`Error al resetear contraseña: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/usuarios/estadisticas/equipo
 * Obtiene estadísticas del equipo de la empresa
 */
const obtenerEstadisticasEquipo = async (req, res, next) => {
    try {
        const estadisticas = await usuarioService.obtenerEstadisticasEquipo(req.tenantId);

        return sendResponse(res, 200, true, 'Estadísticas del equipo', estadisticas);
    } catch (error) {
        logger.error(`Error al obtener estadísticas del equipo: ${error.message}`);
        next(error);
    }
};

module.exports = {
    listarUsuarios,
    obtenerUsuario,
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario,
    activarUsuario,
    desactivarUsuario,
    resetearPassword,
    obtenerEstadisticasEquipo
};