const { ROLES_PERMISOS, PERMISOS_PROPIOS } = require('../../config/permisos');
const logger = require('../../config/logger');

/**
 * Servicio de Permisos RBAC
 * 
 * Centraliza toda la lógica de verificación de permisos.
 * Es la única capa que consulta la matriz ROLES_PERMISOS.
 * Si en el futuro queremos cargar permisos desde BD en lugar
 * del archivo de configuración, solo cambiamos este servicio.
 */

/**
 * Verifica si un rol específico tiene un permiso determinado
 * 
 * @param {string} rol - Rol del usuario (superadmin, administrador, etc.)
 * @param {string} permiso - Permiso a verificar (ej: 'productos.crear')
 * @returns {boolean} true si tiene el permiso, false si no
 */
const tienePermiso = (rol, permiso) => {
    if (!rol || !permiso) {
        return false;
    }

    const permisosDelRol = ROLES_PERMISOS[rol];

    if (!permisosDelRol) {
        logger.warn(`Rol no reconocido en verificación de permisos: ${rol}`);
        return false;
    }

    // SuperAdmin tiene wildcard universal
    if (permisosDelRol.includes('*')) {
        return true;
    }

    return permisosDelRol.includes(permiso);
};

/**
 * Verifica si un rol tiene AL MENOS UNO de los permisos de una lista
 * Útil cuando un endpoint puede ser accedido con permisos alternativos.
 * 
 * @param {string} rol - Rol del usuario
 * @param {string[]} permisos - Lista de permisos aceptables
 * @returns {boolean} true si tiene al menos uno
 */
const tieneAlgunPermiso = (rol, permisos) => {
    if (!rol || !Array.isArray(permisos) || permisos.length === 0) {
        return false;
    }

    return permisos.some(permiso => tienePermiso(rol, permiso));
};

/**
 * Verifica si un rol tiene TODOS los permisos de una lista
 * Útil cuando una acción compleja requiere múltiples permisos simultáneos.
 * 
 * @param {string} rol - Rol del usuario
 * @param {string[]} permisos - Lista de permisos requeridos
 * @returns {boolean} true si tiene todos
 */
const tieneTodosLosPermisos = (rol, permisos) => {
    if (!rol || !Array.isArray(permisos) || permisos.length === 0) {
        return false;
    }

    return permisos.every(permiso => tienePermiso(rol, permiso));
};

/**
 * Determina si un permiso opera solo sobre datos propios del usuario
 * Estos permisos requieren validación adicional de propiedad del registro.
 * 
 * @param {string} permiso - Permiso a verificar
 * @returns {boolean} true si es un permiso de tipo propio
 */
const esPermisoPropio = (permiso) => {
    if (!permiso) return false;
    return PERMISOS_PROPIOS.includes(permiso);
};

/**
 * Obtiene la lista completa de permisos de un rol
 * Útil para el endpoint /api/auth/me y para depuración.
 * 
 * @param {string} rol - Rol del usuario
 * @returns {string[]} Array con todos los permisos del rol
 */
const obtenerPermisosDelRol = (rol) => {
    if (!rol) return [];

    const permisos = ROLES_PERMISOS[rol];

    if (!permisos) {
        logger.warn(`Solicitud de permisos para rol desconocido: ${rol}`);
        return [];
    }

    // Si tiene wildcard, devolvemos un indicador especial
    if (permisos.includes('*')) {
        return ['*'];
    }

    return [...permisos];
};

/**
 * Verifica si un usuario es SuperAdmin
 * Atajo conveniente porque SuperAdmin tiene reglas especiales
 * (acceso transversal entre empresas).
 * 
 * @param {string} rol - Rol del usuario
 * @returns {boolean} true si es SuperAdmin
 */
const esSuperAdmin = (rol) => {
    return rol === 'superadmin';
};

/**
 * Verifica si un usuario es Cliente
 * Atajo conveniente porque el Cliente tiene reglas especiales
 * de confinamiento a sus propios registros.
 * 
 * @param {string} rol - Rol del usuario
 * @returns {boolean} true si es Cliente
 */
const esCliente = (rol) => {
    return rol === 'cliente';
};

/**
 * Valida que un rol exista en el sistema
 * Útil al crear o actualizar usuarios para evitar roles inválidos.
 * 
 * @param {string} rol - Rol a validar
 * @returns {boolean} true si es un rol válido
 */
const esRolValido = (rol) => {
    if (!rol) return false;
    return Object.keys(ROLES_PERMISOS).includes(rol);
};

/**
 * Obtiene la lista de todos los roles disponibles en el sistema
 * Útil para formularios de creación de usuarios y validadores.
 * 
 * @returns {string[]} Array con todos los nombres de roles
 */
const obtenerRolesDisponibles = () => {
    return Object.keys(ROLES_PERMISOS);
};

/**
 * Verifica la jerarquía de roles para operaciones administrativas
 * Un rol no puede crear/editar usuarios con un rol superior al suyo.
 * 
 * Jerarquía (de mayor a menor poder):
 * superadmin > administrador > supervisor > vendedor / produccion > cliente / domiciliario
 * 
 * @param {string} rolActuante - Rol del usuario que ejecuta la acción
 * @param {string} rolObjetivo - Rol que se intenta crear/editar
 * @returns {boolean} true si tiene permiso jerárquico
 */
const puedeGestionarRol = (rolActuante, rolObjetivo) => {
    const jerarquia = {
        superadmin: 6,
        administrador: 5,
        supervisor: 4,
        vendedor: 3,
        produccion: 3,
        domiciliario: 2,
        cliente: 1
    };

    const nivelActuante = jerarquia[rolActuante] || 0;
    const nivelObjetivo = jerarquia[rolObjetivo] || 0;

    // Solo se puede gestionar roles de igual o menor nivel
    // Excepción: SuperAdmin puede gestionar cualquiera
    if (rolActuante === 'superadmin') return true;

    return nivelActuante >= nivelObjetivo;
};

module.exports = {
    tienePermiso,
    tieneAlgunPermiso,
    tieneTodosLosPermisos,
    esPermisoPropio,
    obtenerPermisosDelRol,
    esSuperAdmin,
    esCliente,
    esRolValido,
    obtenerRolesDisponibles,
    puedeGestionarRol
};