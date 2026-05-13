const permisosService = require('../services/shared/permisosService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Middleware RBAC - Role-Based Access Control
 * 
 * Verifica que el usuario autenticado tenga los permisos necesarios
 * para ejecutar una acción específica.
 * 
 * REQUISITOS:
 * - Este middleware DEBE usarse después de verificarAutenticacion
 * - Espera que req.userRole esté inyectado por authMiddleware
 * - Espera que req.userId esté inyectado por authMiddleware
 */

/**
 * Verifica que el usuario tenga un permiso específico
 * 
 * Uso en rutas:
 *   router.post('/products',
 *     verificarAutenticacion,
 *     verificarPermiso('productos.crear'),
 *     productoController.crear
 *   );
 * 
 * @param {string} permisoRequerido - Permiso necesario (ej: 'productos.crear')
 * @returns {Function} Middleware de Express
 */
const verificarPermiso = (permisoRequerido) => {
    return (req, res, next) => {
        try {
            if (!req.userRole) {
                logger.warn('Intento de acceso a ruta protegida sin autenticación previa');
                return sendResponse(res, 401, false, 'Autenticación requerida');
            }

            const tienePermiso = permisosService.tienePermiso(req.userRole, permisoRequerido);

            if (!tienePermiso) {
                logger.warn(`Acceso denegado: usuario ${req.userId} con rol "${req.userRole}" 
                    intentó usar permiso "${permisoRequerido}" en ${req.method} ${req.originalUrl} `);
                return sendResponse(res, 403, false, 'No tienes permiso para realizar esta acción');
            }

            // Guardamos el permiso usado para que el siguiente middleware
            // (validación de propiedad) sepa qué tipo de permiso es
            req.permisoUsado = permisoRequerido;

            next();
        } catch (error) {
            logger.error(`Error en middleware RBAC: ${error.message}`);
            return sendResponse(res, 500, false, 'Error al verificar permisos');
        }
    };
};

/**
 * Verifica que el usuario tenga AL MENOS UNO de los permisos especificados
 * 
 * Útil para endpoints accesibles por múltiples caminos.
 * Ejemplo: ver un pedido puede requerir 'pedidos.ver_todos' o 'pedidos.ver_propios'
 * 
 * Uso en rutas:
 *   router.get('/orders/:id',
 *     verificarAutenticacion,
 *     verificarAlgunPermiso(['pedidos.ver_todos', 'pedidos.ver_propios']),
 *     pedidoController.obtener
 *   );
 * 
 * @param {string[]} permisosAceptables - Lista de permisos válidos
 * @returns {Function} Middleware de Express
 */
const verificarAlgunPermiso = (permisosAceptables) => {
    return (req, res, next) => {
        try {
            if (!req.userRole) {
                return sendResponse(res, 401, false, 'Autenticación requerida');
            }

            if (!Array.isArray(permisosAceptables) || permisosAceptables.length === 0) {
                logger.error('verificarAlgunPermiso llamado sin lista de permisos válida');
                return sendResponse(res, 500, false, 'Error de configuración del servidor');
            }

            const tieneAlguno = permisosService.tieneAlgunPermiso(req.userRole, permisosAceptables);

            if (!tieneAlguno) {
                logger.warn(`Acceso denegado: usuario ${req.userId} con rol "${req.userRole}" 
                    no tiene ninguno de los permisos requeridos en ${req.method} ${req.originalUrl} `);
                return sendResponse(res, 403, false, 'No tienes permiso para realizar esta acción');
            }

            // Identificamos cuál de los permisos aceptables tiene el usuario
            // para usarlo después en la validación de propiedad
            const permisoUsado = permisosAceptables.find(p =>
                permisosService.tienePermiso(req.userRole, p)
            );
            req.permisoUsado = permisoUsado;

            next();
        } catch (error) {
            logger.error(`Error en middleware RBAC (alguno): ${error.message}`);
            return sendResponse(res, 500, false, 'Error al verificar permisos');
        }
    };
};

/**
 * Verifica que el usuario tenga TODOS los permisos especificados
 * 
 * Útil para acciones complejas que requieren múltiples capacidades.
 * Ejemplo: exportar reporte financiero requiere ver Y exportar.
 * 
 * @param {string[]} permisosRequeridos - Lista de permisos obligatorios
 * @returns {Function} Middleware de Express
 */
const verificarTodosLosPermisos = (permisosRequeridos) => {
    return (req, res, next) => {
        try {
            if (!req.userRole) {
                return sendResponse(res, 401, false, 'Autenticación requerida');
            }

            if (!Array.isArray(permisosRequeridos) || permisosRequeridos.length === 0) {
                logger.error('verificarTodosLosPermisos llamado sin lista de permisos válida');
                return sendResponse(res, 500, false, 'Error de configuración del servidor');
            }

            const tieneTodos = permisosService.tieneTodosLosPermisos(req.userRole, permisosRequeridos);

            if (!tieneTodos) {
                logger.warn(`Acceso denegado: usuario ${req.userId} con rol "${req.userRole}" 
                    no tiene todos los permisos requeridos en ${req.method} ${req.originalUrl}`);
                return sendResponse(res, 403, false, 'No tienes todos los permisos necesarios para esta acción');
            }

            req.permisosUsados = permisosRequeridos;
            next();
        } catch (error) {
            logger.error(`Error en middleware RBAC (todos): ${error.message}`);
            return sendResponse(res, 500, false, 'Error al verificar permisos');
        }
    };
};

/**
 * Verifica que el usuario pueda gestionar usuarios con un rol específico
 * 
 * Aplica la jerarquía de roles: nadie puede crear/editar usuarios
 * con un rol superior al suyo.
 * 
 * Uso en rutas de creación/edición de usuarios:
 *   router.post('/users',
 *     verificarAutenticacion,
 *     verificarPermiso('usuarios.crear'),
 *     verificarJerarquiaRol,
 *     usuarioController.crear
 *   );
 * 
 * Espera que el rol objetivo venga en req.body.rol
 */
const verificarJerarquiaRol = (req, res, next) => {
    try {
        if (!req.userRole) {
            return sendResponse(res, 401, false, 'Autenticación requerida');
        }

        const rolObjetivo = req.body.rol;

        // Si no se envía rol en el body, no aplica esta validación
        if (!rolObjetivo) {
            return next();
        }

        if (!permisosService.esRolValido(rolObjetivo)) {
            return sendResponse(res, 400, false, 'El rol especificado no es válido');
        }

        const puedeGestionar = permisosService.puedeGestionarRol(req.userRole, rolObjetivo);

        if (!puedeGestionar) {
            logger.warn(`Intento de escalada de privilegios: usuario ${req.userId} (rol "${req.userRole}")
                intentó asignar rol "${rolObjetivo}" en ${req.method} ${req.originalUrl}`);
            return sendResponse(res, 403, false, 'No puedes asignar un rol superior o igual al tuyo');
        }

        next();
    } catch (error) {
        logger.error(`Error en verificación de jerarquía: ${error.message}`);
        return sendResponse(res, 500, false, 'Error al verificar jerarquía de roles');
    }
};

/**
 * Verifica que el usuario sea exactamente un rol específico
 * 
 * Útil para rutas extremadamente sensibles reservadas a un rol único.
 * 
 * Uso en rutas:
 *   router.delete('/system/empresa/:id',
 *     verificarAutenticacion,
 *     verificarRolEspecifico('superadmin'),
 *     sistemaController.eliminarEmpresa
 *   );
 * 
 * @param {string|string[]} rolesPermitidos - Rol o lista de roles aceptados
 * @returns {Function} Middleware de Express
 */
const verificarRolEspecifico = (rolesPermitidos) => {
    return (req, res, next) => {
        try {
            if (!req.userRole) {
                return sendResponse(res, 401, false, 'Autenticación requerida');
            }

            const roles = Array.isArray(rolesPermitidos) ? rolesPermitidos : [rolesPermitidos];

            if (!roles.includes(req.userRole)) {
                logger.warn(`Acceso denegado por rol: usuario ${req.userId} con rol "${req.userRole}" 
                    intentó acceder a ruta restringida a roles [${roles.join(', ')}]`
                );
                return sendResponse(res, 403, false, 'Esta acción está restringida a roles específicos');
            }

            next();
        } catch (error) {
            logger.error(`Error en verificación de rol específico: ${error.message}`);
            return sendResponse(res, 500, false, 'Error al verificar rol');
        }
    };
};

/**
 * Middleware que bloquea totalmente a los Clientes
 * 
 * Útil para rutas internas de gestión que ningún cliente debe ver.
 * Ejemplo: rutas de gestión interna de inventario, producción, reportes.
 */
const bloquearClientes = (req, res, next) => {
    if (!req.userRole) {
        return sendResponse(res, 401, false, 'Autenticación requerida');
    }

    if (permisosService.esCliente(req.userRole)) {
        logger.warn(`
            Cliente ${req.userId} intentó acceder a ruta interna en ${req.method} ${req.originalUrl}
        `);
        return sendResponse(res, 403, false, 'Esta funcionalidad no está disponible para tu tipo de cuenta');
    }

    next();
};

module.exports = {
    verificarPermiso,
    verificarAlgunPermiso,
    verificarTodosLosPermisos,
    verificarJerarquiaRol,
    verificarRolEspecifico,
    bloquearClientes
};