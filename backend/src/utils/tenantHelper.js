const permisosService = require('../services/shared/permisosService');
const logger = require('../config/logger');

/**
 * Helpers Multi-Tenant para ProdVen
 * 
 * Utilidades complementarias para construir queries seguras
 * y manejar casos especiales del sistema multi-tenant.
 * 
 * Estas funciones son PURAS: no tocan BD ni red, solo construyen
 * objetos que los controladores usarán en sus queries.
 */

/**
 * Construye un filtro WHERE para Sequelize basado en el contexto del usuario
 * 
 * Es la función base que usan otros helpers. Recibe el contexto de
 * la petición y devuelve el objeto de filtro apropiado.
 * 
 * @param {object} req - Request de Express con userId, userRole, tenantId
 * @param {object} filtrosAdicionales - Filtros extra a combinar
 * @returns {object} Objeto WHERE listo para usar en Sequelize
 */
const construirFiltroTenant = (req, filtrosAdicionales = {}) => {
    if (!req.userRole) {
        throw new Error('construirFiltroTenant requiere req.userRole');
    }

    // SuperAdmin: solo aplica los filtros adicionales (sin restricción de empresa)
    if (permisosService.esSuperAdmin(req.userRole)) {
        return { ...filtrosAdicionales };
    }

    // Cualquier otro rol: requiere tenantId obligatoriamente
    if (!req.tenantId) {
        throw new Error('Usuario sin idEmpresa intentando construir filtro tenant');
    }

    return {
        idEmpresa: req.tenantId,
        ...filtrosAdicionales
    };
};

/**
 * Construye un filtro WHERE incluyendo propiedad del registro
 * 
 * Útil para listados donde un Cliente solo debe ver sus propios datos
 * o donde un usuario común solo ve registros que él creó.
 * 
 * @param {object} req - Request de Express
 * @param {string} campoPropiedad - Campo que indica propiedad (idCliente, idUsuario, creadoPor)
 * @param {object} filtrosAdicionales - Filtros extra a combinar
 * @returns {object} Objeto WHERE con tenant + propiedad cuando aplica
 */
const construirFiltroConPropiedad = (req, campoPropiedad, filtrosAdicionales = {}) => {
    const filtroBase = construirFiltroTenant(req, filtrosAdicionales);

    // SuperAdmin: sin filtro adicional
    if (permisosService.esSuperAdmin(req.userRole)) {
        return filtroBase;
    }

    // Cliente: siempre confinado a sus propios registros
    if (permisosService.esCliente(req.userRole)) {
        return {
            ...filtroBase,
            [campoPropiedad]: req.userId
        };
    }

    // Otros roles con permiso de tipo "_propio": confinados a sus registros
    if (req.permisoUsado && permisosService.esPermisoPropio(req.permisoUsado)) {
        return {
            ...filtroBase,
            [campoPropiedad]: req.userId
        };
    }

    return filtroBase;
};

/**
 * Inyecta automáticamente el idEmpresa al crear un nuevo registro
 * 
 * Garantiza que los registros creados siempre queden asociados a la
 * empresa correcta sin depender de que el desarrollador lo recuerde.
 * 
 * @param {object} req - Request de Express
 * @param {object} datos - Datos del registro a crear
 * @returns {object} Datos con idEmpresa inyectado correctamente
 */
const inyectarEmpresa = (req, datos = {}) => {
    if (!req.userRole) {
        throw new Error('inyectarEmpresa requiere req.userRole');
    }

    // SuperAdmin debe especificar la empresa explícitamente
    if (permisosService.esSuperAdmin(req.userRole)) {
        if (!datos.idEmpresa && !req.superadminEnEmpresa) {
            throw new Error('SuperAdmin debe especificar idEmpresa al crear registros');
        }
        return {
            ...datos,
            idEmpresa: datos.idEmpresa || req.superadminEnEmpresa
        };
    }

    // Otros roles: forzar idEmpresa del usuario (ignora cualquier valor que venga del body)
    if (!req.tenantId) {
        throw new Error('Usuario sin idEmpresa no puede crear registros');
    }

    return {
        ...datos,
        idEmpresa: req.tenantId
    };
};

/**
 * Inyecta el usuario creador del registro
 * 
 * Útil para campos como creadoPor, idUsuario, idCliente que deben
 * registrar quién creó cada registro para auditoría y filtrado.
 * 
 * @param {object} req - Request de Express
 * @param {object} datos - Datos del registro
 * @param {string} campoCreador - Campo donde inyectar el ID (por defecto 'creadoPor')
 * @returns {object} Datos con campo creador inyectado
 */
const inyectarCreador = (req, datos = {}, campoCreador = 'creadoPor') => {
    if (!req.userId) {
        throw new Error('inyectarCreador requiere req.userId');
    }

    return {
        ...datos,
        [campoCreador]: req.userId
    };
};

/**
 * Combina inyección de empresa y creador en una sola llamada
 * 
 * Conveniencia para el caso más común al crear registros.
 * 
 * @param {object} req - Request de Express
 * @param {object} datos - Datos del registro
 * @param {string} campoCreador - Campo del creador (opcional, default 'creadoPor')
 * @returns {object} Datos listos para crear con tenant y creador
 */
const prepararDatosCreacion = (req, datos = {}, campoCreador = 'creadoPor') => {
    let preparados = inyectarEmpresa(req, datos);
    preparados = inyectarCreador(req, preparados, campoCreador);
    return preparados;
};

/**
 * Sanitiza datos de actualización removiendo campos sensibles
 * 
 * Evita que un usuario pueda cambiar idEmpresa, idUsuario u otros
 * campos críticos manipulando el body de la petición.
 * 
 * @param {object} datos - Datos enviados por el usuario
 * @param {string[]} camposBloqueados - Campos adicionales a remover
 * @returns {object} Datos sin campos sensibles
 */
const sanitizarDatosActualizacion = (datos = {}, camposBloqueados = []) => {
    const bloqueadosPorDefecto = [
        'idEmpresa',
        'idUsuario',
        'idCliente',
        'creadoPor',
        'fechaCreacion',
        'fechaActualizacion',
        'eliminado'
    ];

    const todosBloqueados = [...bloqueadosPorDefecto, ...camposBloqueados];
    const datosSanitizados = { ...datos };

    todosBloqueados.forEach(campo => {
        delete datosSanitizados[campo];
    });

    return datosSanitizados;
};

/**
 * Valida que múltiples registros pertenezcan a la empresa del usuario
 * 
 * Útil para operaciones en lote donde recibes varios IDs y necesitas
 * confirmar que todos sean accesibles antes de operar sobre ellos.
 * 
 * @param {object} req - Request de Express
 * @param {object[]} registros - Array de registros a validar
 * @returns {object} Objeto con válidos, inválidos y resultado general
 */
const validarPropiedadMasiva = (req, registros = []) => {
    if (!Array.isArray(registros)) {
        return {
            todosValidos: false,
            validos: [],
            invalidos: [],
            mensaje: 'Se esperaba un array de registros'
        };
    }

    // SuperAdmin tiene acceso a todo
    if (permisosService.esSuperAdmin(req.userRole)) {
        return {
            todosValidos: true,
            validos: registros,
            invalidos: [],
            mensaje: 'SuperAdmin tiene acceso a todos los registros'
        };
    }

    const validos = [];
    const invalidos = [];

    registros.forEach(registro => {
        if (registro && registro.idEmpresa === req.tenantId) {
            validos.push(registro);
        } else {
            invalidos.push(registro);
        }
    });

    if (invalidos.length > 0) {
        logger.warn(`
            Validación masiva: usuario ${req.userId} (empresa ${req.tenantId}) 
            intentó operar sobre ${invalidos.length} registro(s) de otras empresas
        `);
    }

    return {
        todosValidos: invalidos.length === 0,
        validos,
        invalidos,
        mensaje: invalidos.length === 0
            ? 'Todos los registros son válidos'
            : `${invalidos.length} de ${registros.length} registros no pertenecen a tu empresa`
    };
};

/**
 * Construye opciones para includes (joins) con filtrado por tenant
 * 
 * Cuando haces queries con asociaciones de Sequelize, las tablas relacionadas
 * también deben filtrarse por empresa. Este helper construye esas opciones.
 * 
 * @param {object} req - Request de Express
 * @param {object} modelo - Modelo Sequelize de la tabla a incluir
 * @param {object} opcionesAdicionales - Opciones extra del include
 * @returns {object} Objeto de include listo para Sequelize
 */
const construirIncludeTenant = (req, modelo, opcionesAdicionales = {}) => {
    const include = {
        model: modelo,
        ...opcionesAdicionales
    };

    // SuperAdmin: include sin restricciones
    if (permisosService.esSuperAdmin(req.userRole)) {
        return include;
    }

    // Otros roles: agregar filtro por empresa al include
    include.where = {
        ...(opcionesAdicionales.where || {}),
        idEmpresa: req.tenantId
    };

    return include;
};

/**
 * Genera un objeto de paginación seguro
 * 
 * Valida los parámetros de paginación y aplica límites razonables
 * para evitar que un usuario solicite millones de registros de una vez.
 * 
 * @param {object} query - Query params de la petición (req.query)
 * @returns {object} Objeto con limit y offset listos para Sequelize
 */
const construirPaginacion = (query = {}) => {
    const LIMITE_MAXIMO = 100;
    const LIMITE_DEFAULT = 20;

    let limit = parseInt(query.limit, 10);
    let pagina = parseInt(query.pagina, 10);

    if (isNaN(limit) || limit <= 0) {
        limit = LIMITE_DEFAULT;
    }

    if (limit > LIMITE_MAXIMO) {
        limit = LIMITE_MAXIMO;
    }

    if (isNaN(pagina) || pagina <= 0) {
        pagina = 1;
    }

    const offset = (pagina - 1) * limit;

    return { limit, offset, pagina };
};

/**
 * Construye metadata de paginación para respuestas
 * 
 * Acompaña los resultados con información útil para el frontend:
 * total de registros, páginas, página actual, etc.
 * 
 * @param {number} total - Total de registros encontrados
 * @param {object} paginacion - Objeto retornado por construirPaginacion
 * @returns {object} Metadata de paginación
 */
const construirMetadataPaginacion = (total, paginacion) => {
    const { limit, pagina } = paginacion;
    const totalPaginas = Math.ceil(total / limit);

    return {
        total,
        pagina,
        limit,
        totalPaginas,
        hayPaginaAnterior: pagina > 1,
        hayPaginaSiguiente: pagina < totalPaginas
    };
};

/**
 * Excluye campos sensibles de un objeto antes de enviarlo al cliente
 * 
 * Útil al devolver datos de usuario para no exponer claveHash, tokens,
 * códigos de verificación u otros datos internos.
 * 
 * @param {object} registro - Registro de BD (puede ser instancia de Sequelize)
 * @param {string[]} camposExtra - Campos adicionales a excluir
 * @returns {object} Objeto seguro para enviar al cliente
 */
const sanitizarRespuesta = (registro, camposExtra = []) => {
    if (!registro) return null;

    const camposSensiblesPorDefecto = [
        'claveHash',
        'twoFactorSecret',
        'token',
        'codigo',
        'intentosFallidos',
        'bloqueadoHasta'
    ];

    const camposExcluir = [...camposSensiblesPorDefecto, ...camposExtra];

    // Si es instancia de Sequelize, obtenemos el objeto plano
    const objeto = registro.toJSON ? registro.toJSON() : { ...registro };

    camposExcluir.forEach(campo => {
        delete objeto[campo];
    });

    return objeto;
};

/**
 * Sanitiza un array de registros aplicando sanitizarRespuesta a cada uno
 * 
 * @param {object[]} registros - Array de registros
 * @param {string[]} camposExtra - Campos adicionales a excluir
 * @returns {object[]} Array de objetos sanitizados
 */
const sanitizarRespuestaMasiva = (registros = [], camposExtra = []) => {
    if (!Array.isArray(registros)) return [];
    return registros.map(r => sanitizarRespuesta(r, camposExtra));
};

module.exports = {
    construirFiltroTenant,
    construirFiltroConPropiedad,
    inyectarEmpresa,
    inyectarCreador,
    prepararDatosCreacion,
    sanitizarDatosActualizacion,
    validarPropiedadMasiva,
    construirIncludeTenant,
    construirPaginacion,
    construirMetadataPaginacion,
    sanitizarRespuesta,
    sanitizarRespuestaMasiva
};