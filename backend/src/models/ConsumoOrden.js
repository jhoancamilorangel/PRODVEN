const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ConsumoOrden = sequelize.define('ConsumoOrden', {
    idConsumo: {
        type: DataTypes.CHAR(36),
        field: 'id_consumo',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria (multi-tenancy)'
    },
    idOrden: {
        type: DataTypes.CHAR(36),
        field: 'id_orden',
        allowNull: false,
        comment: 'Orden de producción que consumió el material'
    },
    idProductoComponente: {
        type: DataTypes.CHAR(36),
        field: 'id_producto_componente',
        allowNull: false,
        comment: 'Material o materia prima consumida'
    },
    idComponenteBom: {
        type: DataTypes.CHAR(36),
        field: 'id_componente_bom',
        allowNull: true,
        comment: 'Componente del BOM al que corresponde este consumo'
    },
    // ==========================================
    // CANTIDADES
    // ==========================================
    cantidadPlanificada: {
        type: DataTypes.DECIMAL(12, 4),
        field: 'cantidad_planificada',
        allowNull: false,
        defaultValue: 0.0000,
        comment: 'Cantidad que el BOM indicaba consumir (con merma esperada)'
    },
    cantidadConsumida: {
        type: DataTypes.DECIMAL(12, 4),
        field: 'cantidad_consumida',
        allowNull: false,
        validate: {
            min: { args: [0], msg: 'La cantidad consumida no puede ser negativa' }
        },
        comment: 'Cantidad realmente consumida'
    },
    cantidadMermaReal: {
        type: DataTypes.DECIMAL(12, 4),
        field: 'cantidad_merma_real',
        allowNull: false,
        defaultValue: 0.0000,
        comment: 'Merma real registrada (diferencia entre planificado y consumido si aplica)'
    },
    unidadMedida: {
        type: DataTypes.ENUM('unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'),
        field: 'unidad_medida',
        allowNull: false,
        defaultValue: 'unidad'
    },
    // ==========================================
    // COSTO
    // ==========================================
    costoUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_unitario',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo unitario del material al momento del consumo (costo promedio)'
    },
    costoTotal: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_total',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo total del consumo (cantidad consumida * costo unitario)'
    },
    // ==========================================
    // TRAZABILIDAD CON INVENTARIO
    // ==========================================
    idMovimientoInventario: {
        type: DataTypes.CHAR(36),
        field: 'id_movimiento_inventario',
        allowNull: true,
        comment: 'Movimiento de inventario que registró esta salida (trazabilidad)'
    },
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        allowNull: true,
        comment: 'Bodega de donde se consumió el material'
    },
    // ==========================================
    // SUSTITUCIÓN
    // ==========================================
    fueSustituido: {
        type: DataTypes.BOOLEAN,
        field: 'fue_sustituido',
        allowNull: false,
        defaultValue: false,
        comment: 'Si se usó un producto sustituto en lugar del componente original'
    },
    idProductoOriginal: {
        type: DataTypes.CHAR(36),
        field: 'id_producto_original',
        allowNull: true,
        comment: 'Producto que debía usarse originalmente, si hubo sustitución'
    },
    // ==========================================
    // LOTE (trazabilidad de perecederos)
    // ==========================================
    numeroLote: {
        type: DataTypes.STRING(50),
        field: 'numero_lote',
        allowNull: true,
        comment: 'Lote del material consumido, si aplica'
    },
    // ==========================================
    // NOTAS
    // ==========================================
    observaciones: {
        type: DataTypes.STRING(500),
        field: 'observaciones',
        allowNull: true
    }
}, {
    tableName: 'consumos_orden',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true,
    indexes: [
        {
            fields: ['id_orden']
        },
        {
            fields: ['id_empresa', 'id_producto_componente']
        },
        {
            fields: ['id_movimiento_inventario']
        },
        {
            fields: ['id_empresa', 'fecha_creacion']
        }
    ]
});

/**
 * Calcula la diferencia entre lo planificado y lo realmente consumido
 * Positivo significa que se consumió más de lo planificado (sobreconsumo)
 * Negativo significa que se consumió menos (ahorro)
 */
ConsumoOrden.prototype.calcularDesviacion = function() {
    const planificado = parseFloat(this.cantidadPlanificada);
    const consumido = parseFloat(this.cantidadConsumida);
    return Math.round((consumido - planificado) * 10000) / 10000;
};

/**
 * Calcula el porcentaje de desviación respecto a lo planificado
 */
ConsumoOrden.prototype.calcularPorcentajeDesviacion = function() {
    const planificado = parseFloat(this.cantidadPlanificada);
    if (planificado <= 0) return 0;

    const desviacion = this.calcularDesviacion();
    return Math.round((desviacion / planificado) * 10000) / 100;
};

/**
 * Recalcula el costo total del consumo
 */
ConsumoOrden.prototype.recalcularCosto = function() {
    const cantidad = parseFloat(this.cantidadConsumida) || 0;
    const costoUnitario = parseFloat(this.costoUnitario) || 0;
    this.costoTotal = Math.round(cantidad * costoUnitario * 100) / 100;
    return parseFloat(this.costoTotal);
};

/**
 * Devuelve los datos del consumo para mostrar
 */
ConsumoOrden.prototype.datosCompletos = function() {
    return {
        idConsumo: this.idConsumo,
        idOrden: this.idOrden,
        idProductoComponente: this.idProductoComponente,
        idComponenteBom: this.idComponenteBom,
        cantidadPlanificada: parseFloat(this.cantidadPlanificada),
        cantidadConsumida: parseFloat(this.cantidadConsumida),
        cantidadMermaReal: parseFloat(this.cantidadMermaReal),
        desviacion: this.calcularDesviacion(),
        porcentajeDesviacion: this.calcularPorcentajeDesviacion(),
        unidadMedida: this.unidadMedida,
        costoUnitario: parseFloat(this.costoUnitario),
        costoTotal: parseFloat(this.costoTotal),
        idMovimientoInventario: this.idMovimientoInventario,
        idBodega: this.idBodega,
        fueSustituido: this.fueSustituido,
        idProductoOriginal: this.idProductoOriginal,
        numeroLote: this.numeroLote,
        observaciones: this.observaciones,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = ConsumoOrden;