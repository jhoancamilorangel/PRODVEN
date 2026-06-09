const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const OrdenProduccion = sequelize.define('OrdenProduccion', {
    idOrden: {
        type: DataTypes.CHAR(36),
        field: 'id_orden',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria (multi-tenancy)'
    },
    numeroOrden: {
        type: DataTypes.STRING(30),
        field: 'numero_orden',
        allowNull: false,
        comment: 'Número consecutivo legible de la orden (ej: OP-2026-0001)'
    },
    // ==========================================
    // PRODUCTO Y RECETA
    // ==========================================
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: false,
        comment: 'Producto a fabricar'
    },
    idBom: {
        type: DataTypes.CHAR(36),
        field: 'id_bom',
        allowNull: false,
        comment: 'Versión del BOM usada (trazabilidad: qué receta se aplicó)'
    },
    numeroVersionBom: {
        type: DataTypes.INTEGER,
        field: 'numero_version_bom',
        allowNull: false,
        comment: 'Número de versión del BOM al momento de crear la orden'
    },
    // ==========================================
    // CANTIDADES
    // ==========================================
    cantidadProducir: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad_producir',
        allowNull: false,
        validate: {
            min: { args: [0.001], msg: 'La cantidad a producir debe ser mayor a cero' }
        },
        comment: 'Cantidad planificada a fabricar'
    },
    cantidadProducida: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad_producida',
        allowNull: false,
        defaultValue: 0.000,
        comment: 'Cantidad realmente fabricada (puede diferir de lo planificado)'
    },
    cantidadDefectuosa: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad_defectuosa',
        allowNull: false,
        defaultValue: 0.000,
        comment: 'Unidades que salieron defectuosas y no entran al inventario'
    },
    unidadMedida: {
        type: DataTypes.ENUM('unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'),
        field: 'unidad_medida',
        allowNull: false,
        defaultValue: 'unidad'
    },
    // ==========================================
    // BODEGA
    // ==========================================
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        allowNull: true,
        comment: 'Bodega donde se consumen materiales y se ingresa el producto terminado'
    },
    // ==========================================
    // ESTADO Y CICLO DE VIDA
    // ==========================================
    estado: {
        type: DataTypes.ENUM('pendiente', 'en_proceso', 'completada', 'cancelada'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'pendiente',
        comment: 'Estado actual de la orden de producción'
    },
    prioridad: {
        type: DataTypes.ENUM('baja', 'normal', 'alta', 'urgente'),
        field: 'prioridad',
        allowNull: false,
        defaultValue: 'normal'
    },
    materialesReservados: {
        type: DataTypes.BOOLEAN,
        field: 'materiales_reservados',
        allowNull: false,
        defaultValue: false,
        comment: 'Si los materiales ya fueron reservados del inventario'
    },
    materialesConsumidos: {
        type: DataTypes.BOOLEAN,
        field: 'materiales_consumidos',
        allowNull: false,
        defaultValue: false,
        comment: 'Si los materiales ya fueron consumidos (salida real)'
    },
    productoIngresado: {
        type: DataTypes.BOOLEAN,
        field: 'producto_ingresado',
        allowNull: false,
        defaultValue: false,
        comment: 'Si el producto terminado ya fue ingresado al inventario'
    },
    // ==========================================
    // FECHAS DEL PROCESO
    // ==========================================
    fechaPlanificada: {
        type: DataTypes.DATE,
        field: 'fecha_planificada',
        allowNull: true,
        comment: 'Fecha planificada para iniciar la producción'
    },
    fechaInicio: {
        type: DataTypes.DATE,
        field: 'fecha_inicio',
        allowNull: true,
        comment: 'Cuándo se inició realmente la producción'
    },
    fechaFin: {
        type: DataTypes.DATE,
        field: 'fecha_fin',
        allowNull: true,
        comment: 'Cuándo se completó la producción'
    },
    fechaCancelacion: {
        type: DataTypes.DATE,
        field: 'fecha_cancelacion',
        allowNull: true
    },
    // ==========================================
    // COSTOS REALES
    // ==========================================
    costoMaterialesEstimado: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_materiales_estimado',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo de materiales estimado según el BOM al crear la orden'
    },
    costoMaterialesReal: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_materiales_real',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo real de los materiales consumidos'
    },
    costoManoObra: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_mano_obra',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo de mano de obra de esta orden'
    },
    costoIndirecto: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_indirecto',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costos indirectos asignados a esta orden'
    },
    costoTotalReal: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_total_real',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo total real de la producción'
    },
    costoUnitarioReal: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_unitario_real',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo real por unidad producida'
    },
    // ==========================================
    // RESPONSABLES
    // ==========================================
    idCreador: {
        type: DataTypes.CHAR(36),
        field: 'id_creador',
        allowNull: true,
        comment: 'Usuario que creó la orden'
    },
    nombreCreador: {
        type: DataTypes.STRING(150),
        field: 'nombre_creador',
        allowNull: true
    },
    idResponsableProduccion: {
        type: DataTypes.CHAR(36),
        field: 'id_responsable_produccion',
        allowNull: true,
        comment: 'Usuario responsable de ejecutar la producción'
    },
    // ==========================================
    // NOTAS Y MOTIVOS
    // ==========================================
    observaciones: {
        type: DataTypes.TEXT,
        field: 'observaciones',
        allowNull: true
    },
    motivoCancelacion: {
        type: DataTypes.STRING(500),
        field: 'motivo_cancelacion',
        allowNull: true
    },
    // ==========================================
    // ESTADO TÉCNICO
    // ==========================================
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'ordenes_produccion',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['id_empresa', 'numero_orden'],
            name: 'idx_unique_numero_orden_por_empresa'
        },
        {
            fields: ['id_empresa', 'estado']
        },
        {
            fields: ['id_empresa', 'id_producto']
        },
        {
            fields: ['id_empresa', 'estado', 'prioridad']
        }
    ]
});

/**
 * Verifica si la orden puede iniciarse
 * Solo las pendientes con materiales reservados pueden iniciar
 */
OrdenProduccion.prototype.puedeIniciar = function() {
    return this.estado === 'pendiente' && this.eliminado === false;
};

/**
 * Verifica si la orden puede completarse
 * Solo las que están en proceso pueden completarse
 */
OrdenProduccion.prototype.puedeCompletar = function() {
    return this.estado === 'en_proceso' && this.eliminado === false;
};

/**
 * Verifica si la orden puede cancelarse
 * Pendientes y en proceso pueden cancelarse; completadas no
 */
OrdenProduccion.prototype.puedeCancelar = function() {
    return ['pendiente', 'en_proceso'].includes(this.estado) && this.eliminado === false;
};

/**
 * Calcula el rendimiento de la producción en porcentaje
 * Compara lo producido bueno contra lo planificado
 */
OrdenProduccion.prototype.calcularRendimiento = function() {
    const planificado = parseFloat(this.cantidadProducir);
    const producidoBueno = parseFloat(this.cantidadProducida) - parseFloat(this.cantidadDefectuosa);

    if (planificado <= 0) return 0;

    const rendimiento = (producidoBueno / planificado) * 100;
    return Math.round(rendimiento * 100) / 100;
};

/**
 * Recalcula los costos totales y unitarios de la orden
 */
OrdenProduccion.prototype.recalcularCostos = function() {
    const materiales = parseFloat(this.costoMaterialesReal) || 0;
    const manoObra = parseFloat(this.costoManoObra) || 0;
    const indirecto = parseFloat(this.costoIndirecto) || 0;

    this.costoTotalReal = Math.round((materiales + manoObra + indirecto) * 100) / 100;

    const producidoBueno = parseFloat(this.cantidadProducida) - parseFloat(this.cantidadDefectuosa);

    if (producidoBueno > 0) {
        this.costoUnitarioReal = Math.round((this.costoTotalReal / producidoBueno) * 100) / 100;
    } else {
        this.costoUnitarioReal = 0;
    }
};

/**
 * Devuelve una etiqueta legible del estado
 */
OrdenProduccion.prototype.etiquetaEstado = function() {
    const etiquetas = {
        pendiente: 'Pendiente',
        en_proceso: 'En proceso',
        completada: 'Completada',
        cancelada: 'Cancelada'
    };
    return etiquetas[this.estado] || this.estado;
};

/**
 * Devuelve un resumen de la orden para listados
 */
OrdenProduccion.prototype.resumen = function() {
    return {
        idOrden: this.idOrden,
        numeroOrden: this.numeroOrden,
        idProducto: this.idProducto,
        idBom: this.idBom,
        numeroVersionBom: this.numeroVersionBom,
        cantidadProducir: parseFloat(this.cantidadProducir),
        cantidadProducida: parseFloat(this.cantidadProducida),
        cantidadDefectuosa: parseFloat(this.cantidadDefectuosa),
        unidadMedida: this.unidadMedida,
        estado: this.estado,
        etiquetaEstado: this.etiquetaEstado(),
        prioridad: this.prioridad,
        rendimiento: this.calcularRendimiento(),
        costoTotalReal: parseFloat(this.costoTotalReal),
        costoUnitarioReal: parseFloat(this.costoUnitarioReal),
        fechaPlanificada: this.fechaPlanificada,
        fechaInicio: this.fechaInicio,
        fechaFin: this.fechaFin,
        nombreCreador: this.nombreCreador,
        fechaCreacion: this.fecha_creacion
    };
};

/**
 * Devuelve los datos completos de la orden
 */
OrdenProduccion.prototype.datosCompletos = function() {
    return {
        ...this.resumen(),
        idEmpresa: this.idEmpresa,
        idBodega: this.idBodega,
        materialesReservados: this.materialesReservados,
        materialesConsumidos: this.materialesConsumidos,
        productoIngresado: this.productoIngresado,
        costoMaterialesEstimado: parseFloat(this.costoMaterialesEstimado),
        costoMaterialesReal: parseFloat(this.costoMaterialesReal),
        costoManoObra: parseFloat(this.costoManoObra),
        costoIndirecto: parseFloat(this.costoIndirecto),
        idCreador: this.idCreador,
        idResponsableProduccion: this.idResponsableProduccion,
        observaciones: this.observaciones,
        motivoCancelacion: this.motivoCancelacion,
        fechaCancelacion: this.fechaCancelacion
    };
};

module.exports = OrdenProduccion;