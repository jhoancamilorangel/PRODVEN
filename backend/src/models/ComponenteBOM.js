const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ComponenteBOM = sequelize.define('ComponenteBOM', {
    idComponente: {
        type: DataTypes.CHAR(36),
        field: 'id_componente',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria (multi-tenancy)'
    },
    idBom: {
        type: DataTypes.CHAR(36),
        field: 'id_bom',
        allowNull: false,
        comment: 'BOM (receta) al que pertenece este componente'
    },
    idProductoComponente: {
        type: DataTypes.CHAR(36),
        field: 'id_producto_componente',
        allowNull: false,
        comment: 'Producto que actúa como materia prima o insumo'
    },
    // ==========================================
    // CANTIDAD REQUERIDA
    // ==========================================
    cantidad: {
        type: DataTypes.DECIMAL(12, 4),
        field: 'cantidad',
        allowNull: false,
        validate: {
            min: { args: [0.0001], msg: 'La cantidad debe ser mayor a cero' }
        },
        comment: 'Cantidad de este componente necesaria para producir la cantidad base del BOM'
    },
    unidadMedida: {
        type: DataTypes.ENUM('unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'),
        field: 'unidad_medida',
        allowNull: false,
        defaultValue: 'unidad',
        comment: 'Unidad en que se mide este componente en la receta'
    },
    // ==========================================
    // MERMA ESPERADA
    // ==========================================
    porcentajeMerma: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'porcentaje_merma',
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'El porcentaje de merma no puede ser negativo' },
            max: { args: [100], msg: 'El porcentaje de merma no puede superar 100' }
        },
        comment: 'Merma esperada de este componente (ej: 5% de desperdicio normal)'
    },
    cantidadConMerma: {
        type: DataTypes.DECIMAL(12, 4),
        field: 'cantidad_con_merma',
        allowNull: false,
        defaultValue: 0.0000,
        comment: 'Cantidad real a consumir incluyendo la merma esperada (calculado)'
    },
    // ==========================================
    // COSTO
    // ==========================================
    costoUnitarioComponente: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_unitario_componente',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo del componente al momento de calcular (snapshot del costo promedio)'
    },
    costoTotalComponente: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_total_componente',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo total de este componente en la receta (cantidad con merma * costo unitario)'
    },
    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    esOpcional: {
        type: DataTypes.BOOLEAN,
        field: 'es_opcional',
        allowNull: false,
        defaultValue: false,
        comment: 'Si el componente es opcional (no bloquea la producción si falta)'
    },
    esSustituible: {
        type: DataTypes.BOOLEAN,
        field: 'es_sustituible',
        allowNull: false,
        defaultValue: false,
        comment: 'Si este componente puede reemplazarse por otro'
    },
    idProductoSustituto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto_sustituto',
        allowNull: true,
        comment: 'Producto alternativo si el principal no está disponible'
    },
    ordenVisualizacion: {
        type: DataTypes.INTEGER,
        field: 'orden_visualizacion',
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden en que aparece el componente en la receta'
    },
    notas: {
        type: DataTypes.STRING(255),
        field: 'notas',
        allowNull: true,
        comment: 'Notas específicas del componente (ej: "usar fresco", "marca específica")'
    },
    // ==========================================
    // ESTADO
    // ==========================================
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        allowNull: false,
        defaultValue: true
    },
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'componentes_bom',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            fields: ['id_bom', 'activo']
        },
        {
            fields: ['id_empresa', 'id_producto_componente']
        },
        {
            unique: true,
            fields: ['id_bom', 'id_producto_componente'],
            name: 'idx_unique_componente_por_bom',
            where: {
                eliminado: false
            }
        }
    ]
});

/**
 * Calcula la cantidad real a consumir incluyendo la merma esperada
 * Ejemplo: si se necesitan 100 unidades y la merma es 5%,
 * la cantidad con merma es 105 unidades
 */
ComponenteBOM.prototype.calcularCantidadConMerma = function() {
    const cantidadBase = parseFloat(this.cantidad);
    const merma = parseFloat(this.porcentajeMerma) || 0;
    const factor = 1 + (merma / 100);
    this.cantidadConMerma = Math.round(cantidadBase * factor * 10000) / 10000;
    return parseFloat(this.cantidadConMerma);
};

/**
 * Recalcula el costo total del componente
 * Usa la cantidad con merma multiplicada por el costo unitario
 */
ComponenteBOM.prototype.recalcularCosto = function() {
    const cantidad = parseFloat(this.cantidadConMerma) || parseFloat(this.cantidad);
    const costoUnitario = parseFloat(this.costoUnitarioComponente) || 0;
    this.costoTotalComponente = Math.round(cantidad * costoUnitario * 100) / 100;
    return parseFloat(this.costoTotalComponente);
};

/**
 * Calcula cuánto de este componente se necesita para una cantidad de producción dada
 *
 * @param {number} cantidadAProducir - Unidades del producto final a fabricar
 * @param {number} cantidadBaseBom - Cuántas unidades produce el BOM base
 * @returns {number} Cantidad de componente necesaria (con merma incluida)
 */
ComponenteBOM.prototype.calcularCantidadParaProduccion = function(cantidadAProducir, cantidadBaseBom) {
    const cantidadConMerma = parseFloat(this.cantidadConMerma) || parseFloat(this.cantidad);
    const base = parseFloat(cantidadBaseBom) || 1;
    const factor = parseFloat(cantidadAProducir) / base;
    return Math.round(cantidadConMerma * factor * 10000) / 10000;
};

/**
 * Devuelve los datos del componente para mostrar
 */
ComponenteBOM.prototype.datosCompletos = function() {
    return {
        idComponente: this.idComponente,
        idBom: this.idBom,
        idProductoComponente: this.idProductoComponente,
        cantidad: parseFloat(this.cantidad),
        unidadMedida: this.unidadMedida,
        porcentajeMerma: parseFloat(this.porcentajeMerma),
        cantidadConMerma: parseFloat(this.cantidadConMerma),
        costoUnitarioComponente: parseFloat(this.costoUnitarioComponente),
        costoTotalComponente: parseFloat(this.costoTotalComponente),
        esOpcional: this.esOpcional,
        esSustituible: this.esSustituible,
        idProductoSustituto: this.idProductoSustituto,
        ordenVisualizacion: this.ordenVisualizacion,
        notas: this.notas
    };
};

module.exports = ComponenteBOM;