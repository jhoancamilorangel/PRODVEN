const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const BillOfMaterials = sequelize.define('BillOfMaterials', {
    idBom: {
        type: DataTypes.CHAR(36),
        field: 'id_bom',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria (multi-tenancy)'
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: false,
        comment: 'Producto fabricado al que pertenece esta receta'
    },
    // ==========================================
    // VERSIONADO
    // ==========================================
    numeroVersion: {
        type: DataTypes.INTEGER,
        field: 'numero_version',
        allowNull: false,
        defaultValue: 1,
        comment: 'Número de versión incremental por producto'
    },
    nombreVersion: {
        type: DataTypes.STRING(100),
        field: 'nombre_version',
        allowNull: true,
        comment: 'Etiqueta amigable de la versión (ej: "Receta original", "Optimizada 2026")'
    },
    esActiva: {
        type: DataTypes.BOOLEAN,
        field: 'es_activa',
        allowNull: false,
        defaultValue: false,
        comment: 'Solo una versión puede estar activa por producto a la vez'
    },
    // ==========================================
    // CONFIGURACIÓN PRODUCTIVA
    // ==========================================
    cantidadProduce: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad_produce',
        allowNull: false,
        defaultValue: 1.000,
        validate: {
            min: { args: [0.001], msg: 'La cantidad producida debe ser mayor a cero' }
        },
        comment: 'Cuántas unidades del producto final se obtienen con esta receta'
    },
    unidadProduccion: {
        type: DataTypes.ENUM('unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'),
        field: 'unidad_produccion',
        allowNull: false,
        defaultValue: 'unidad',
        comment: 'Unidad de medida del producto producido'
    },
    tiempoEstimadoMinutos: {
        type: DataTypes.INTEGER,
        field: 'tiempo_estimado_minutos',
        allowNull: true,
        comment: 'Tiempo promedio que tarda fabricar la cantidad indicada'
    },
    // ==========================================
    // COSTEO
    // ==========================================
    costoMaterialesUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_materiales_unitario',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo de materias primas por unidad producida (calculado)'
    },
    costoManoObraUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_mano_obra_unitario',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo de mano de obra por unidad producida'
    },
    costoIndirectoUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_indirecto_unitario',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costos indirectos de fabricación por unidad (energía, etc)'
    },
    costoTotalUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_total_unitario',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Suma de los tres costos anteriores (calculado)'
    },
    // ==========================================
    // DESCRIPCIÓN Y NOTAS
    // ==========================================
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true,
        comment: 'Descripción general de la receta'
    },
    instruccionesFabricacion: {
        type: DataTypes.TEXT,
        field: 'instrucciones_fabricacion',
        allowNull: true,
        comment: 'Pasos detallados del proceso de fabricación'
    },
    notasInternas: {
        type: DataTypes.TEXT,
        field: 'notas_internas',
        allowNull: true,
        comment: 'Notas privadas del responsable de producción'
    },
    // ==========================================
    // RESPONSABLES
    // ==========================================
    idCreador: {
        type: DataTypes.CHAR(36),
        field: 'id_creador',
        allowNull: true,
        comment: 'Usuario que creó esta versión del BOM'
    },
    nombreCreador: {
        type: DataTypes.STRING(150),
        field: 'nombre_creador',
        allowNull: true,
        comment: 'Snapshot del nombre del creador'
    },
    idAprobador: {
        type: DataTypes.CHAR(36),
        field: 'id_aprobador',
        allowNull: true,
        comment: 'Usuario que aprobó esta versión para producción'
    },
    fechaAprobacion: {
        type: DataTypes.DATE,
        field: 'fecha_aprobacion',
        allowNull: true
    },
    // ==========================================
    // ESTADO Y VIGENCIA
    // ==========================================
    estado: {
        type: DataTypes.ENUM('borrador', 'aprobada', 'archivada'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'borrador',
        comment: 'Estado del BOM en su ciclo de vida'
    },
    fechaActivacion: {
        type: DataTypes.DATE,
        field: 'fecha_activacion',
        allowNull: true,
        comment: 'Cuándo entró en vigencia esta versión'
    },
    fechaDesactivacion: {
        type: DataTypes.DATE,
        field: 'fecha_desactivacion',
        allowNull: true,
        comment: 'Cuándo fue reemplazada por una nueva versión'
    },
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'bill_of_materials',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['id_producto', 'numero_version'],
            name: 'idx_unique_version_por_producto'
        },
        {
            fields: ['id_empresa', 'id_producto', 'es_activa']
        },
        {
            fields: ['id_empresa', 'estado']
        }
    ]
});

/**
 * Verifica si este BOM puede usarse para producir
 */
BillOfMaterials.prototype.estaDisponibleParaProducir = function() {
    return this.estado === 'aprobada' && this.esActiva === true && this.eliminado === false;
};

/**
 * Verifica si el BOM puede editarse
 * Solo los borradores se pueden editar
 */
BillOfMaterials.prototype.esEditable = function() {
    return this.estado === 'borrador' && this.eliminado === false;
};

/**
 * Recalcula y actualiza el costo total unitario sumando los tres tipos de costo
 */
BillOfMaterials.prototype.recalcularCostoTotal = function() {
    const materiales = parseFloat(this.costoMaterialesUnitario) || 0;
    const manoObra = parseFloat(this.costoManoObraUnitario) || 0;
    const indirectos = parseFloat(this.costoIndirectoUnitario) || 0;
    this.costoTotalUnitario = Math.round((materiales + manoObra + indirectos) * 100) / 100;
};

/**
 * Devuelve un resumen del BOM para listados
 */
BillOfMaterials.prototype.resumen = function() {
    return {
        idBom: this.idBom,
        idProducto: this.idProducto,
        numeroVersion: this.numeroVersion,
        nombreVersion: this.nombreVersion,
        esActiva: this.esActiva,
        estado: this.estado,
        cantidadProduce: parseFloat(this.cantidadProduce),
        unidadProduccion: this.unidadProduccion,
        tiempoEstimadoMinutos: this.tiempoEstimadoMinutos,
        costoMaterialesUnitario: parseFloat(this.costoMaterialesUnitario),
        costoManoObraUnitario: parseFloat(this.costoManoObraUnitario),
        costoIndirectoUnitario: parseFloat(this.costoIndirectoUnitario),
        costoTotalUnitario: parseFloat(this.costoTotalUnitario),
        nombreCreador: this.nombreCreador,
        fechaCreacion: this.fecha_creacion,
        fechaActivacion: this.fechaActivacion
    };
};

/**
 * Devuelve los datos detallados del BOM
 */
BillOfMaterials.prototype.datosCompletos = function() {
    return {
        ...this.resumen(),
        descripcion: this.descripcion,
        instruccionesFabricacion: this.instruccionesFabricacion,
        notasInternas: this.notasInternas,
        idCreador: this.idCreador,
        idAprobador: this.idAprobador,
        fechaAprobacion: this.fechaAprobacion,
        fechaDesactivacion: this.fechaDesactivacion
    };
};

module.exports = BillOfMaterials;