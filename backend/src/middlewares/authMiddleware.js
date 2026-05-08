const authService = require('../services/shared/authService');
const Usuario = require('../models/Usuario');
const TokenAcceso = require('../models/TokenAcceso');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Middleware principal de autenticación
 * Verifica que el token JWT sea válido y que el usuario esté activo
 * Inyecta en req: userId, userRole, tenantId, usuario
 */
const verificarAutenticacion = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendResponse(res, 401, false, 'Token de acceso no proporcionado');
        }

        const token = authHeader.replace('Bearer ', '');

        const tokenDb = await TokenAcceso.findOne({
            where: {
                token,
                tipo: 'access',
                activo: true
            }
        });

        if (!tokenDb) {
            return sendResponse(res, 401, false, 'Token revocado o no válido');
        }

        if (!tokenDb.estaVigente()) {
            return sendResponse(res, 401, false, 'Token expirado');
        }

        let decoded;
        try {
            decoded = authService.verificarAccessToken(token);
        } catch (error) {
            return sendResponse(res, 401, false, 'Token inválido o expirado');
        }

        const usuario = await Usuario.findByPk(decoded.idUsuario);

        if (!usuario) {
            return sendResponse(res, 401, false, 'Usuario no encontrado');
        }

        if (usuario.eliminado) {
            return sendResponse(res, 403, false, 'Esta cuenta fue eliminada');
        }

        if (!usuario.activo) {
            return sendResponse(res, 403, false, 'Esta cuenta está desactivada');
        }

        req.userId = usuario.idUsuario;
        req.userRole = usuario.rol;
        req.tenantId = usuario.idEmpresa;
        req.usuario = usuario;

        next();
    } catch (error) {
        logger.error(`Error en middleware de autenticación: ${error.message}`);
        return sendResponse(res, 500, false, 'Error al verificar autenticación');
    }
};

/**
 * Middleware opcional que verifica el token solo si está presente
 * Útil para rutas públicas que pueden tener comportamiento distinto si hay sesión
 */
const verificarAutenticacionOpcional = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.replace('Bearer ', '');

        const tokenDb = await TokenAcceso.findOne({
            where: { token, tipo: 'access', activo: true }
        });

        if (!tokenDb || !tokenDb.estaVigente()) {
            return next();
        }

        let decoded;
        try {
            decoded = authService.verificarAccessToken(token);
        } catch (error) {
            return next();
        }

        const usuario = await Usuario.findByPk(decoded.idUsuario);

        if (usuario && !usuario.eliminado && usuario.activo) {
            req.userId = usuario.idUsuario;
            req.userRole = usuario.rol;
            req.tenantId = usuario.idEmpresa;
            req.usuario = usuario;
        }

        next();
    } catch (error) {
        logger.error(`Error en autenticación opcional: ${error.message}`);
        next();
    }
};

/**
 * Middleware que verifica que el usuario sea SuperAdmin
 * Para rutas de administración global del sistema
 */
const verificarSuperAdmin = (req, res, next) => {
    if (!req.userRole) {
        return sendResponse(res, 401, false, 'Autenticación requerida');
    }

    if (req.userRole !== 'superadmin') {
        logger.warn(`Intento de acceso a ruta SuperAdmin por usuario ${req.userId} con rol ${req.userRole}`);
        return sendResponse(res, 403, false, 'Acceso denegado. Solo SuperAdmin puede realizar esta acción');
    }

    next();
};

/**
 * Middleware que verifica que el usuario tenga cuenta verificada
 * Algunas acciones requieren que el correo esté confirmado
 */
const verificarCuentaVerificada = (req, res, next) => {
    if (!req.usuario) {
        return sendResponse(res, 401, false, 'Autenticación requerida');
    }

    if (!req.usuario.verificado) {
        return sendResponse(res, 403, false, 'Debes verificar tu correo para realizar esta acción');
    }

    next();
};

module.exports = {
    verificarAutenticacion,
    verificarAutenticacionOpcional,
    verificarSuperAdmin,
    verificarCuentaVerificada
};