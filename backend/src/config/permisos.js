/**
 * Matriz de Permisos RBAC para ProdVen
 * 
 * Versión 2.1 - Actualizada en Fase 7
 * 
 * Cada permiso sigue el formato: 'modulo.accion'
 * Cada rol tiene una lista de permisos específicos que puede ejecutar.
 * 
 * REGLAS CRÍTICAS:
 * - SuperAdmin tiene acceso a TODO mediante el wildcard '*'
 * - Cliente está confinado a sus propios datos mediante permisos con sufijo '_propio'
 * - Todos los demás roles están confinados a su idEmpresa
 */

// =====================================================
// CATÁLOGO DE MÓDULOS Y ACCIONES DISPONIBLES
// =====================================================
const MODULOS = {
    // Administración global del sistema (solo SuperAdmin)
    SISTEMA: {
        VER_EMPRESAS: 'sistema.ver_empresas',
        CREAR_EMPRESA: 'sistema.crear_empresa',
        EDITAR_EMPRESA: 'sistema.editar_empresa',
        ELIMINAR_EMPRESA: 'sistema.eliminar_empresa',
        ACTIVAR_EMPRESA: 'sistema.activar_empresa',
        DESACTIVAR_EMPRESA: 'sistema.desactivar_empresa',
        SUSPENDER_EMPRESA: 'sistema.suspender_empresa',
        GESTIONAR_SUSCRIPCIONES: 'sistema.gestionar_suscripciones',
        VER_ESTADISTICAS_GLOBALES: 'sistema.ver_estadisticas_globales',
        VER_LOGS_GLOBALES: 'sistema.ver_logs_globales',
        GESTIONAR_PLANES: 'sistema.gestionar_planes'
    },

    // Configuración de la empresa propia
    EMPRESA: {
        VER_MI_EMPRESA: 'empresa.ver_mi_empresa',
        VER_CONFIGURACION: 'empresa.ver_configuracion',
        EDITAR_CONFIGURACION: 'empresa.editar_configuracion',
        GESTIONAR_METODOS_PAGO: 'empresa.gestionar_metodos_pago',
        TOGGLE_MARKETPLACE: 'empresa.toggle_marketplace',
        TOGGLE_MANTENIMIENTO: 'empresa.toggle_mantenimiento',
        VER_SUSCRIPCION: 'empresa.ver_suscripcion',
        CANCELAR_SUSCRIPCION: 'empresa.cancelar_suscripcion'
    },

    // Gestión de usuarios dentro de la empresa
    USUARIOS: {
        VER: 'usuarios.ver',
        CREAR: 'usuarios.crear',
        EDITAR: 'usuarios.editar',
        ELIMINAR: 'usuarios.eliminar',
        ASIGNAR_ROL: 'usuarios.asignar_rol',
        VER_PERFIL_PROPIO: 'usuarios.ver_perfil_propio',
        EDITAR_PERFIL_PROPIO: 'usuarios.editar_perfil_propio'
    },

    // Productos y catálogo
    PRODUCTOS: {
        VER: 'productos.ver',
        CREAR: 'productos.crear',
        EDITAR: 'productos.editar',
        ELIMINAR: 'productos.eliminar',
        GESTIONAR_IMAGENES: 'productos.gestionar_imagenes',
        PUBLICAR_MARKETPLACE: 'productos.publicar_marketplace'
    },

    // Categorías y proveedores
    CATEGORIAS: {
        VER: 'categorias.ver',
        CREAR: 'categorias.crear',
        EDITAR: 'categorias.editar',
        ELIMINAR: 'categorias.eliminar'
    },

    PROVEEDORES: {
        VER: 'proveedores.ver',
        CREAR: 'proveedores.crear',
        EDITAR: 'proveedores.editar',
        ELIMINAR: 'proveedores.eliminar'
    },

    // Inventario, stock y bodegas
    INVENTARIO: {
        VER: 'inventario.ver',
        AJUSTAR: 'inventario.ajustar',
        VER_MOVIMIENTOS: 'inventario.ver_movimientos',
        EXPORTAR: 'inventario.exportar',
        GESTIONAR_BODEGAS: 'inventario.gestionar_bodegas'
    },

    // Producción y Bill of Materials
    PRODUCCION: {
        VER_ORDENES: 'produccion.ver_ordenes',
        CREAR_ORDEN: 'produccion.crear_orden',
        INICIAR_ORDEN: 'produccion.iniciar_orden',
        COMPLETAR_ORDEN: 'produccion.completar_orden',
        CANCELAR_ORDEN: 'produccion.cancelar_orden',
        GESTIONAR_BOM: 'produccion.gestionar_bom'
    },

    // Clientes
    CLIENTES: {
        VER: 'clientes.ver',
        CREAR: 'clientes.crear',
        EDITAR: 'clientes.editar',
        ELIMINAR: 'clientes.eliminar',
        VER_HISTORIAL: 'clientes.ver_historial'
    },

    // Pedidos y carrito
    PEDIDOS: {
        VER_TODOS: 'pedidos.ver_todos',
        VER_PROPIOS: 'pedidos.ver_propios',
        CREAR: 'pedidos.crear',
        CREAR_PROPIO: 'pedidos.crear_propio',
        MODIFICAR_ESTADO: 'pedidos.modificar_estado',
        CANCELAR: 'pedidos.cancelar',
        CANCELAR_PROPIO: 'pedidos.cancelar_propio',
        ELIMINAR: 'pedidos.eliminar',
        ASIGNAR_DOMICILIARIO: 'pedidos.asignar_domiciliario'
    },

    // Pagos y facturación
    PAGOS: {
        PROCESAR: 'pagos.procesar',
        VER: 'pagos.ver',
        VER_PROPIOS: 'pagos.ver_propios',
        REEMBOLSAR: 'pagos.reembolsar',
        EXPORTAR_FACTURAS: 'pagos.exportar_facturas'
    },

    // Promociones y descuentos
    PROMOCIONES: {
        VER: 'promociones.ver',
        CREAR: 'promociones.crear',
        EDITAR: 'promociones.editar',
        ELIMINAR: 'promociones.eliminar'
    },

    // Reseñas
    RESENAS: {
        VER: 'resenas.ver',
        CREAR: 'resenas.crear',
        RESPONDER: 'resenas.responder',
        MODERAR: 'resenas.moderar',
        ELIMINAR: 'resenas.eliminar'
    },

    // Mensajería
    MENSAJES: {
        VER_CONVERSACIONES: 'mensajes.ver_conversaciones',
        ENVIAR: 'mensajes.enviar',
        ELIMINAR_PROPIO: 'mensajes.eliminar_propio'
    },

    // Notificaciones
    NOTIFICACIONES: {
        VER_PROPIAS: 'notificaciones.ver_propias',
        MARCAR_LEIDA: 'notificaciones.marcar_leida',
        ENVIAR_MASIVA: 'notificaciones.enviar_masiva'
    },

    // Reportes y analytics
    REPORTES: {
        VER_VENTAS: 'reportes.ver_ventas',
        VER_INVENTARIO: 'reportes.ver_inventario',
        VER_PRODUCCION: 'reportes.ver_produccion',
        VER_FINANCIEROS: 'reportes.ver_financieros',
        EXPORTAR: 'reportes.exportar'
    },

    // Auditoría
    AUDITORIA: {
        VER_REGISTROS: 'auditoria.ver_registros',
        VER_LOGS_ACTIVIDAD: 'auditoria.ver_logs_actividad',
        EXPORTAR: 'auditoria.exportar'
    },

    // Logística
    LOGISTICA: {
        VER_ZONAS: 'logistica.ver_zonas',
        GESTIONAR_ZONAS: 'logistica.gestionar_zonas',
        VER_DOMICILIARIOS: 'logistica.ver_domiciliarios',
        GESTIONAR_DOMICILIARIOS: 'logistica.gestionar_domiciliarios',
        ACTUALIZAR_UBICACION: 'logistica.actualizar_ubicacion'
    }
};

// =====================================================
// MATRIZ DE PERMISOS POR ROL
// =====================================================
const ROLES_PERMISOS = {
    /**
     * SUPERADMIN
     * Acceso total al sistema. Usa wildcard '*'.
     */
    superadmin: ['*'],

    /**
     * ADMINISTRADOR
     * Dueño/gerente de la empresa. Gestiona todo dentro de su empresa.
     */
    administrador: [
        // Empresa propia
        MODULOS.EMPRESA.VER_MI_EMPRESA,
        MODULOS.EMPRESA.VER_CONFIGURACION,
        MODULOS.EMPRESA.EDITAR_CONFIGURACION,
        MODULOS.EMPRESA.GESTIONAR_METODOS_PAGO,
        MODULOS.EMPRESA.TOGGLE_MARKETPLACE,
        MODULOS.EMPRESA.TOGGLE_MANTENIMIENTO,
        MODULOS.EMPRESA.VER_SUSCRIPCION,
        MODULOS.EMPRESA.CANCELAR_SUSCRIPCION,

        // Usuarios de su empresa
        MODULOS.USUARIOS.VER,
        MODULOS.USUARIOS.CREAR,
        MODULOS.USUARIOS.EDITAR,
        MODULOS.USUARIOS.ELIMINAR,
        MODULOS.USUARIOS.ASIGNAR_ROL,
        MODULOS.USUARIOS.VER_PERFIL_PROPIO,
        MODULOS.USUARIOS.EDITAR_PERFIL_PROPIO,

        // Productos completos
        MODULOS.PRODUCTOS.VER,
        MODULOS.PRODUCTOS.CREAR,
        MODULOS.PRODUCTOS.EDITAR,
        MODULOS.PRODUCTOS.ELIMINAR,
        MODULOS.PRODUCTOS.GESTIONAR_IMAGENES,
        MODULOS.PRODUCTOS.PUBLICAR_MARKETPLACE,

        // Categorías y proveedores
        MODULOS.CATEGORIAS.VER,
        MODULOS.CATEGORIAS.CREAR,
        MODULOS.CATEGORIAS.EDITAR,
        MODULOS.CATEGORIAS.ELIMINAR,
        MODULOS.PROVEEDORES.VER,
        MODULOS.PROVEEDORES.CREAR,
        MODULOS.PROVEEDORES.EDITAR,
        MODULOS.PROVEEDORES.ELIMINAR,

        // Inventario completo (incluye gestión de bodegas)
        MODULOS.INVENTARIO.VER,
        MODULOS.INVENTARIO.AJUSTAR,
        MODULOS.INVENTARIO.VER_MOVIMIENTOS,
        MODULOS.INVENTARIO.EXPORTAR,
        MODULOS.INVENTARIO.GESTIONAR_BODEGAS,

        // Producción
        MODULOS.PRODUCCION.VER_ORDENES,
        MODULOS.PRODUCCION.CREAR_ORDEN,
        MODULOS.PRODUCCION.INICIAR_ORDEN,
        MODULOS.PRODUCCION.COMPLETAR_ORDEN,
        MODULOS.PRODUCCION.CANCELAR_ORDEN,
        MODULOS.PRODUCCION.GESTIONAR_BOM,

        // Clientes
        MODULOS.CLIENTES.VER,
        MODULOS.CLIENTES.CREAR,
        MODULOS.CLIENTES.EDITAR,
        MODULOS.CLIENTES.ELIMINAR,
        MODULOS.CLIENTES.VER_HISTORIAL,

        // Pedidos completos
        MODULOS.PEDIDOS.VER_TODOS,
        MODULOS.PEDIDOS.CREAR,
        MODULOS.PEDIDOS.MODIFICAR_ESTADO,
        MODULOS.PEDIDOS.CANCELAR,
        MODULOS.PEDIDOS.ELIMINAR,
        MODULOS.PEDIDOS.ASIGNAR_DOMICILIARIO,

        // Pagos
        MODULOS.PAGOS.PROCESAR,
        MODULOS.PAGOS.VER,
        MODULOS.PAGOS.REEMBOLSAR,
        MODULOS.PAGOS.EXPORTAR_FACTURAS,

        // Promociones
        MODULOS.PROMOCIONES.VER,
        MODULOS.PROMOCIONES.CREAR,
        MODULOS.PROMOCIONES.EDITAR,
        MODULOS.PROMOCIONES.ELIMINAR,

        // Reseñas
        MODULOS.RESENAS.VER,
        MODULOS.RESENAS.RESPONDER,
        MODULOS.RESENAS.MODERAR,
        MODULOS.RESENAS.ELIMINAR,

        // Mensajes
        MODULOS.MENSAJES.VER_CONVERSACIONES,
        MODULOS.MENSAJES.ENVIAR,
        MODULOS.MENSAJES.ELIMINAR_PROPIO,

        // Notificaciones
        MODULOS.NOTIFICACIONES.VER_PROPIAS,
        MODULOS.NOTIFICACIONES.MARCAR_LEIDA,
        MODULOS.NOTIFICACIONES.ENVIAR_MASIVA,

        // Reportes
        MODULOS.REPORTES.VER_VENTAS,
        MODULOS.REPORTES.VER_INVENTARIO,
        MODULOS.REPORTES.VER_PRODUCCION,
        MODULOS.REPORTES.VER_FINANCIEROS,
        MODULOS.REPORTES.EXPORTAR,

        // Auditoría
        MODULOS.AUDITORIA.VER_REGISTROS,
        MODULOS.AUDITORIA.VER_LOGS_ACTIVIDAD,
        MODULOS.AUDITORIA.EXPORTAR,

        // Logística
        MODULOS.LOGISTICA.VER_ZONAS,
        MODULOS.LOGISTICA.GESTIONAR_ZONAS,
        MODULOS.LOGISTICA.VER_DOMICILIARIOS,
        MODULOS.LOGISTICA.GESTIONAR_DOMICILIARIOS
    ],

    /**
     * VENDEDOR
     * Crea pedidos, consulta productos y clientes. No accede a configuración ni reportes financieros.
     */
    vendedor: [
        MODULOS.USUARIOS.VER_PERFIL_PROPIO,
        MODULOS.USUARIOS.EDITAR_PERFIL_PROPIO,

        // Ver datos básicos de su empresa
        MODULOS.EMPRESA.VER_MI_EMPRESA,
        MODULOS.EMPRESA.VER_SUSCRIPCION,

        // Solo consulta productos
        MODULOS.PRODUCTOS.VER,
        MODULOS.CATEGORIAS.VER,

        // Solo consulta inventario (sin ver costos detallados)
        MODULOS.INVENTARIO.VER,

        // Gestión completa de clientes
        MODULOS.CLIENTES.VER,
        MODULOS.CLIENTES.CREAR,
        MODULOS.CLIENTES.EDITAR,
        MODULOS.CLIENTES.VER_HISTORIAL,

        // Pedidos: ver todos de la empresa y crear
        MODULOS.PEDIDOS.VER_TODOS,
        MODULOS.PEDIDOS.CREAR,
        MODULOS.PEDIDOS.MODIFICAR_ESTADO,

        // Crear reservas al armar pedidos
        MODULOS.INVENTARIO.AJUSTAR,

        // Procesar pagos al vender
        MODULOS.PAGOS.PROCESAR,
        MODULOS.PAGOS.VER,

        // Ver promociones disponibles
        MODULOS.PROMOCIONES.VER,

        // Comunicación
        MODULOS.MENSAJES.VER_CONVERSACIONES,
        MODULOS.MENSAJES.ENVIAR,
        MODULOS.MENSAJES.ELIMINAR_PROPIO,
        MODULOS.NOTIFICACIONES.VER_PROPIAS,
        MODULOS.NOTIFICACIONES.MARCAR_LEIDA
    ],

    /**
     * PRODUCCION
     * Gestiona órdenes de producción y consume materiales. No ve precios de venta ni datos financieros.
     */
    produccion: [
        MODULOS.USUARIOS.VER_PERFIL_PROPIO,
        MODULOS.USUARIOS.EDITAR_PERFIL_PROPIO,

        // Ver datos básicos de su empresa
        MODULOS.EMPRESA.VER_MI_EMPRESA,

        // Solo ver productos (sin precios sensibles)
        MODULOS.PRODUCTOS.VER,
        MODULOS.CATEGORIAS.VER,

        // Inventario completo (ajustes de producción)
        MODULOS.INVENTARIO.VER,
        MODULOS.INVENTARIO.AJUSTAR,
        MODULOS.INVENTARIO.VER_MOVIMIENTOS,

        // Producción completa
        MODULOS.PRODUCCION.VER_ORDENES,
        MODULOS.PRODUCCION.CREAR_ORDEN,
        MODULOS.PRODUCCION.INICIAR_ORDEN,
        MODULOS.PRODUCCION.COMPLETAR_ORDEN,
        MODULOS.PRODUCCION.CANCELAR_ORDEN,
        MODULOS.PRODUCCION.GESTIONAR_BOM,

        // Proveedores (para reposición de materiales)
        MODULOS.PROVEEDORES.VER,

        // Reportes de producción e inventario
        MODULOS.REPORTES.VER_INVENTARIO,
        MODULOS.REPORTES.VER_PRODUCCION,

        // Comunicación
        MODULOS.MENSAJES.VER_CONVERSACIONES,
        MODULOS.MENSAJES.ENVIAR,
        MODULOS.MENSAJES.ELIMINAR_PROPIO,
        MODULOS.NOTIFICACIONES.VER_PROPIAS,
        MODULOS.NOTIFICACIONES.MARCAR_LEIDA
    ],

    /**
     * SUPERVISOR
     * Acceso a reportes y auditoría. Supervisa operaciones sin modificar datos críticos.
     */
    supervisor: [
        MODULOS.USUARIOS.VER_PERFIL_PROPIO,
        MODULOS.USUARIOS.EDITAR_PERFIL_PROPIO,

        // Ver datos básicos de su empresa
        MODULOS.EMPRESA.VER_MI_EMPRESA,
        MODULOS.EMPRESA.VER_SUSCRIPCION,

        // Solo consulta de todo
        MODULOS.PRODUCTOS.VER,
        MODULOS.CATEGORIAS.VER,
        MODULOS.PROVEEDORES.VER,
        MODULOS.INVENTARIO.VER,
        MODULOS.INVENTARIO.VER_MOVIMIENTOS,
        MODULOS.INVENTARIO.EXPORTAR,
        MODULOS.PRODUCCION.VER_ORDENES,
        MODULOS.CLIENTES.VER,
        MODULOS.CLIENTES.VER_HISTORIAL,

        // Ver pedidos pero no modificarlos
        MODULOS.PEDIDOS.VER_TODOS,

        // Ver pagos pero no procesarlos
        MODULOS.PAGOS.VER,

        // Promociones solo lectura
        MODULOS.PROMOCIONES.VER,

        // Reseñas: ver y moderar
        MODULOS.RESENAS.VER,
        MODULOS.RESENAS.MODERAR,

        // Reportes completos
        MODULOS.REPORTES.VER_VENTAS,
        MODULOS.REPORTES.VER_INVENTARIO,
        MODULOS.REPORTES.VER_PRODUCCION,
        MODULOS.REPORTES.VER_FINANCIEROS,
        MODULOS.REPORTES.EXPORTAR,

        // Auditoría completa
        MODULOS.AUDITORIA.VER_REGISTROS,
        MODULOS.AUDITORIA.VER_LOGS_ACTIVIDAD,
        MODULOS.AUDITORIA.EXPORTAR,

        // Logística: asignar domiciliarios
        MODULOS.LOGISTICA.VER_ZONAS,
        MODULOS.LOGISTICA.VER_DOMICILIARIOS,
        MODULOS.PEDIDOS.ASIGNAR_DOMICILIARIO,

        // Comunicación
        MODULOS.MENSAJES.VER_CONVERSACIONES,
        MODULOS.MENSAJES.ENVIAR,
        MODULOS.MENSAJES.ELIMINAR_PROPIO,
        MODULOS.NOTIFICACIONES.VER_PROPIAS,
        MODULOS.NOTIFICACIONES.MARCAR_LEIDA
    ],

    /**
     * CLIENTE
     * Solo accede a sus propios datos. Confinamiento estricto por usuario.
     */
    cliente: [
        // Solo su perfil
        MODULOS.USUARIOS.VER_PERFIL_PROPIO,
        MODULOS.USUARIOS.EDITAR_PERFIL_PROPIO,

        // Ver catálogo (marketplace o tienda privada)
        MODULOS.PRODUCTOS.VER,
        MODULOS.CATEGORIAS.VER,
        MODULOS.PROMOCIONES.VER,

        // Solo sus propios pedidos
        MODULOS.PEDIDOS.VER_PROPIOS,
        MODULOS.PEDIDOS.CREAR_PROPIO,
        MODULOS.PEDIDOS.CANCELAR_PROPIO,

        // Solo sus propios pagos
        MODULOS.PAGOS.PROCESAR,
        MODULOS.PAGOS.VER_PROPIOS,

        // Reseñas: crear sobre productos que compró
        MODULOS.RESENAS.VER,
        MODULOS.RESENAS.CREAR,

        // Comunicación con el negocio
        MODULOS.MENSAJES.VER_CONVERSACIONES,
        MODULOS.MENSAJES.ENVIAR,
        MODULOS.MENSAJES.ELIMINAR_PROPIO,
        MODULOS.NOTIFICACIONES.VER_PROPIAS,
        MODULOS.NOTIFICACIONES.MARCAR_LEIDA
    ],

    /**
     * DOMICILIARIO (rol futuro para app móvil de entregas)
     * Acceso muy limitado: ver pedidos asignados y actualizar ubicación.
     */
    domiciliario: [
        MODULOS.USUARIOS.VER_PERFIL_PROPIO,
        MODULOS.USUARIOS.EDITAR_PERFIL_PROPIO,
        MODULOS.PEDIDOS.VER_PROPIOS,
        MODULOS.PEDIDOS.MODIFICAR_ESTADO,
        MODULOS.LOGISTICA.ACTUALIZAR_UBICACION,
        MODULOS.MENSAJES.VER_CONVERSACIONES,
        MODULOS.MENSAJES.ENVIAR,
        MODULOS.NOTIFICACIONES.VER_PROPIAS,
        MODULOS.NOTIFICACIONES.MARCAR_LEIDA
    ]
};

// =====================================================
// PERMISOS QUE OPERAN SOLO SOBRE DATOS PROPIOS
// =====================================================
const PERMISOS_PROPIOS = [
    'usuarios.ver_perfil_propio',
    'usuarios.editar_perfil_propio',
    'pedidos.ver_propios',
    'pedidos.crear_propio',
    'pedidos.cancelar_propio',
    'pagos.ver_propios',
    'notificaciones.ver_propias',
    'mensajes.eliminar_propio'
];

module.exports = {
    MODULOS,
    ROLES_PERMISOS,
    PERMISOS_PROPIOS
};