const authService = require('../services/shared/authService');
const permisosService = require('../services/shared/permisosService');
const Usuario = require('../models/Usuario');
const TokenAcceso = require('../models/TokenAcceso');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Middleware de Autenticación con Integración RBAC
 * 
 * Verifica el token JWT y enriquece la petición con toda la información
 * necesaria para los middlewares siguientes y los controladores.
 * 
 * INYECTA EN req:
 * - userId: ID del usuario autenticado
 * - userRole: Rol del usuario
 * - tenantId: ID de la empresa del usuario (null para SuperAdmin)
 * - usuario: Objeto completo del usuario
 * - permisos: Array con todos los permisos del usuario
 * - puedeHacer(permiso): Función helper para verificar permisos en controladores
 */

/**
 * Middleware principal de autenticación
 * Valida el token y enriquece la petición con datos del usuario y permisos
 */
const verificarAutenticacion = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return sendResponse(res, 401, false, 'Token de acceso no proporcionado');
        }

        const token = authHeader.replace('Bearer ', '');

        // Validación 1: Token existe en BD y está activo
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

        // Validación 2: Token no ha expirado
        if (!tokenDb.estaVigente()) {
            return sendResponse(res, 401, false, 'Token expirado');
        }

        // Validación 3: JWT criptográficamente válido
        let decoded;
        try {
            decoded = authService.verificarAccessToken(token);
        } catch (error) {
            return sendResponse(res, 401, false, 'Token inválido o expirado');
        }

        // Validación 4: Usuario existe y está activo
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

        // Inyección de datos básicos del usuario
        req.userId = usuario.idUsuario;
        req.userRole = usuario.rol;
        req.tenantId = usuario.idEmpresa;
        req.usuario = usuario;

        // Inyección de permisos del usuario
        req.permisos = permisosService.obtenerPermisosDelRol(usuario.rol);

        // Helper para verificar permisos directamente en controladores
        // Útil cuando necesitas validar permisos dinámicamente dentro de la lógica
        req.puedeHacer = (permiso) => {
            return permisosService.tienePermiso(usuario.rol, permiso);
        };

        // Información adicional sobre el contexto del usuario
        req.esSuperAdmin = permisosService.esSuperAdmin(usuario.rol);
        req.esCliente = permisosService.esCliente(usuario.rol);

        next();
    } catch (error) {
        logger.error(`Error en middleware de autenticación: ${error.message}`);
        return sendResponse(res, 500, false, 'Error al verificar autenticación');
    }
};

/**
 * Middleware opcional de autenticación
 * 
 * Verifica el token solo si está presente. Útil para rutas públicas
 * que pueden tener comportamiento distinto si hay sesión iniciada.
 * 
 * Si no hay token o es inválido: continúa sin inyectar datos.
 * Si hay token válido: inyecta los mismos datos que verificarAutenticacion.
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
            req.permisos = permisosService.obtenerPermisosDelRol(usuario.rol);
            req.puedeHacer = (permiso) => permisosService.tienePermiso(usuario.rol, permiso);
            req.esSuperAdmin = permisosService.esSuperAdmin(usuario.rol);
            req.esCliente = permisosService.esCliente(usuario.rol);
        }

        next();
    } catch (error) {
        logger.error(`Error en autenticación opcional: ${error.message}`);
        next();
    }
};

/**
 * Middleware que verifica que el usuario sea SuperAdmin
 * Atajo conveniente para rutas exclusivas de SuperAdmin
 */
const verificarSuperAdmin = (req, res, next) => {
    if (!req.userRole) {
        return sendResponse(res, 401, false, 'Autenticación requerida');
    }

    if (!permisosService.esSuperAdmin(req.userRole)) {
        logger.warn(`
            Intento de acceso a ruta SuperAdmin: usuario ${req.userId} con rol ${req.userRole}
        `);
        return sendResponse(res, 403, false, 'Acceso denegado. Solo SuperAdmin puede realizar esta acción');
    }

    next();
};

/**
 * Middleware que verifica que el usuario tenga cuenta verificada
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