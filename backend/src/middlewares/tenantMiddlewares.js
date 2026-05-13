const permisosService = require('../services/shared/permisosService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * Middleware Multi-Tenant
 * 
 * Garantiza el aislamiento total de datos entre empresas.
 * 
 * REGLAS CRÍTICAS:
 * - Todos los roles excepto SuperAdmin están confinados a su idEmpresa
 * - SuperAdmin tiene acceso transversal y puede operar sobre cualquier empresa
 * - Cliente además está confinado a sus propios registros (creados por él)
 * - Cualquier intento de acceder a otra empresa queda registrado como incidente
 * 
 * REQUISITOS:
 * - Este middleware DEBE usarse después de verificarAutenticacion
 * - Espera que req.tenantId, req.userRole y req.userId estén inyectados
 */

/**
 * Aplica el filtro de tenant a las queries de la petición
 * 
 * Inyecta en req.filtroTenant un objeto que los controladores deben
 * usar en TODAS sus queries para garantizar el aislamiento.
 * 
 * Para SuperAdmin: filtro vacío (acceso a todas las empresas)
 * Para todos los demás: filtro con idEmpresa del usuario
 * 
 * Uso en rutas:
 *   router.get('/products',
 *     verificarAutenticacion,
 *     aplicarFiltroTenant,
 *     productoController.listar
 *   );
 * 
 * En el controlador:
 *   const productos = await Producto.findAll({ where: req.filtroTenant });
 */
const aplicarFiltroTenant = (req, res, next) => {
    try {
        if (!req.userId || !req.userRole) {
            logger.warn('aplicarFiltroTenant llamado sin autenticación previa');
            return sendResponse(res, 401, false, 'Autenticación requerida');
        }

        // SuperAdmin: sin filtro, acceso a todas las empresas
        if (permisosService.esSuperAdmin(req.userRole)) {
            req.filtroTenant = {};
            req.esAccesoTransversal = true;
            return next();
        }

        // Validación crítica: cualquier rol que no sea SuperAdmin
        // debe tener idEmpresa asignado obligatoriamente
        if (!req.tenantId) {
            logger.error(`
                Usuario ${req.userId} con rol "${req.userRole}" no tiene idEmpresa asignado. 
                Esto indica un error de datos crítico.
            `);
            return sendResponse(res, 403, false, 'Tu cuenta no está asociada a una empresa válida');
        }

        // Filtro estándar: aislamiento por empresa
        req.filtroTenant = { idEmpresa: req.tenantId };
        req.esAccesoTransversal = false;

        next();
    } catch (error) {
        logger.error(`Error en aplicarFiltroTenant: ${error.message}`);
        return sendResponse(res, 500, false, 'Error al aplicar filtro de empresa');
    }
};

/**
 * Aplica filtro de tenant + filtro de propiedad para Clientes
 * 
 * Para Clientes, además del aislamiento por empresa, los confina
 * a sus propios registros (creados por ellos o asociados a su id).
 * 
 * Uso en rutas que pueden ser accedidas por Cliente:
 *   router.get('/orders',
 *     verificarAutenticacion,
 *     verificarAlgunPermiso(['pedidos.ver_todos', 'pedidos.ver_propios']),
 *     aplicarFiltroTenantConPropiedad,
 *     pedidoController.listar
 *   );
 * 
 * En el controlador:
 *   const pedidos = await Pedido.findAll({ where: req.filtroTenant });
 *   // Si es Cliente, req.filtroTenant incluirá idCliente automáticamente
 * 
 * @param {string} campoPropiedad - Nombre del campo que indica propiedad (ej: 'idCliente', 'idUsuario')
 */
const aplicarFiltroTenantConPropiedad = (campoPropiedad = 'idCliente') => {
    return (req, res, next) => {
        try {
            if (!req.userId || !req.userRole) {
                return sendResponse(res, 401, false, 'Autenticación requerida');
            }

            // SuperAdmin: sin filtros
            if (permisosService.esSuperAdmin(req.userRole)) {
                req.filtroTenant = {};
                req.esAccesoTransversal = true;
                return next();
            }

            if (!req.tenantId) {
                logger.error(`
                    Usuario ${req.userId} con rol "${req.userRole}" sin idEmpresa asignado
                `);
                return sendResponse(res, 403, false, 'Tu cuenta no está asociada a una empresa válida');
            }

            // Cliente: filtro doble (empresa + propiedad)
            if (permisosService.esCliente(req.userRole)) {
                req.filtroTenant = {
                    idEmpresa: req.tenantId,
                    [campoPropiedad]: req.userId
                };
                req.esAccesoTransversal = false;
                req.esAccesoPropio = true;
                return next();
            }

            // Otros roles: solo filtro por empresa
            // PERO si el permiso usado es "_propio", aplicamos también filtro de propiedad
            if (req.permisoUsado && permisosService.esPermisoPropio(req.permisoUsado)) {
                req.filtroTenant = {
                    idEmpresa: req.tenantId,
                    [campoPropiedad]: req.userId
                };
                req.esAccesoTransversal = false;
                req.esAccesoPropio = true;
                return next();
            }

            // Caso estándar: filtro por empresa
            req.filtroTenant = { idEmpresa: req.tenantId };
            req.esAccesoTransversal = false;
            req.esAccesoPropio = false;

            next();
        } catch (error) {
            logger.error(`Error en aplicarFiltroTenantConPropiedad: ${error.message}`);
            return sendResponse(res, 500, false, 'Error al aplicar filtros de acceso');
        }
    };
};

/**
 * Verifica que un registro específico pertenezca a la empresa del usuario
 * 
 * Útil para acciones sobre registros individuales (PUT, DELETE, GET por ID).
 * Previene que un usuario manipule el ID en la URL para acceder a datos
 * de otra empresa.
 * 
 * Uso en controladores (después de obtener el registro):
 *   const producto = await Producto.findByPk(req.params.id);
 *   if (!validarPropiedadTenant(req, producto)) {
 *     return sendResponse(res, 404, false, 'Producto no encontrado');
 *   }
 * 
 * @param {object} req - Request de Express
 * @param {object} registro - Registro de BD a validar
 * @returns {boolean} true si el registro pertenece al tenant del usuario
 */
const validarPropiedadTenant = (req, registro) => {
    if (!registro) return false;

    // SuperAdmin tiene acceso a cualquier registro
    if (permisosService.esSuperAdmin(req.userRole)) {
        return true;
    }

    // El registro debe tener idEmpresa
    if (!registro.idEmpresa) {
        logger.error(`Registro sin idEmpresa detectado al validar propiedad. 
            Modelo posiblemente mal diseñado. `);
        return false;
    }

    // El idEmpresa del registro debe coincidir con el del usuario
    return registro.idEmpresa === req.tenantId;
};

/**
 * Middleware que valida propiedad por empresa al final del controlador
 * 
 * Útil cuando el controlador busca un registro por ID y necesitamos
 * confirmar que pertenece a la empresa del usuario antes de operar.
 * 
 * Espera que el controlador inyecte el registro en req.registroAccedido
 * Si el registro es de otra empresa, devuelve 404 (no 403) para no
 * revelar la existencia del registro.
 */
const verificarPropiedadRegistro = (req, res, next) => {
    try {
        const registro = req.registroAccedido;

        if (!registro) {
            return sendResponse(res, 404, false, 'Registro no encontrado');
        }

        if (!validarPropiedadTenant(req, registro)) {
            logger.warn(`
                Intento de acceso cruzado: usuario ${req.userId} (empresa ${req.tenantId})
                intentó acceder a registro de empresa ${registro.idEmpresa}
                en ${req.method} ${req.originalUrl}
            `);
            // Devolvemos 404 en lugar de 403 para no revelar existencia
            return sendResponse(res, 404, false, 'Registro no encontrado');
        }

        next();
    } catch (error) {
        logger.error(`Error en verificarPropiedadRegistro: ${error.message}`);
        return sendResponse(res, 500, false, 'Error al verificar acceso al registro');
    }
};

/**
 * Permite que SuperAdmin opere sobre una empresa específica
 * 
 * Cuando SuperAdmin envía el header "X-Target-Empresa", el sistema
 * filtra los datos por esa empresa en lugar de mostrarle todo.
 * 
 * Útil para que SuperAdmin pueda "ponerse en los zapatos" de una empresa
 * sin tener que loguearse como administrador de esa empresa.
 * 
 * Uso en rutas:
 *   router.get('/admin/empresas/:id/productos',
 *     verificarAutenticacion,
 *     verificarRolEspecifico('superadmin'),
 *     superadminSeleccionarEmpresa,
 *     productoController.listar
 *   );
 */
const superadminSeleccionarEmpresa = (req, res, next) => {
    try {
        if (!permisosService.esSuperAdmin(req.userRole)) {
            return sendResponse(res, 403, false, 'Esta acción es exclusiva de SuperAdmin');
        }

        // Buscar la empresa objetivo en header o parámetros de URL
        const empresaObjetivo = req.headers['x-target-empresa'] || req.params.idEmpresa;

        if (empresaObjetivo) {
            req.tenantId = empresaObjetivo;
            req.filtroTenant = { idEmpresa: empresaObjetivo };
            req.esAccesoTransversal = false;
            req.superadminEnEmpresa = empresaObjetivo;

            logger.info(`
                SuperAdmin ${req.userId} operando sobre empresa ${empresaObjetivo} 
                en ${req.method} ${req.originalUrl}
            `);
        } else {
            // Sin empresa objetivo: acceso transversal completo
            req.filtroTenant = {};
            req.esAccesoTransversal = true;
        }

        next();
    } catch (error) {
        logger.error(`Error en superadminSeleccionarEmpresa: ${error.message}`);
        return sendResponse(res, 500, false, 'Error al seleccionar empresa');
    }
};

/**
 * Bloquea operaciones que requieren empresa cuando el usuario no la tiene
 * 
 * Algunos usuarios pueden quedar temporalmente sin empresa
 * (ej: durante el registro inicial antes de asociarse a una).
 * Este middleware previene operaciones imposibles en esos casos.
 */
const requiereEmpresa = (req, res, next) => {
    if (permisosService.esSuperAdmin(req.userRole)) {
        return next();
    }

    if (!req.tenantId) {
        logger.warn(`
            Usuario ${req.userId} sin empresa intentó acceder a ${req.method} ${req.originalUrl}
        `);
        return sendResponse(res, 403, false, 'Debes estar asociado a una empresa para realizar esta acción');
    }

    next();
};

module.exports = {
    aplicarFiltroTenant,
    aplicarFiltroTenantConPropiedad,
    validarPropiedadTenant,
    verificarPropiedadRegistro,
    superadminSeleccionarEmpresa,
    requiereEmpresa
};