const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const StockProducto = sequelize.define('StockProducto', {
    idStockProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_stock_producto',
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
        comment: 'Producto al que pertenece este registro de stock'
    },
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        allowNull: false,
        comment: 'Bodega donde se ubica el stock'
    },
    // ==========================================
    // CANTIDADES
    // ==========================================
    cantidadFisica: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad_fisica',
        allowNull: false,
        defaultValue: 0.000,
        validate: {
            min: { args: [0], msg: 'La cantidad física no puede ser negativa' }
        },
        comment: 'Stock real en esta bodega'
    },
    cantidadReservada: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad_reservada',
        allowNull: false,
        defaultValue: 0.000,
        validate: {
            min: { args: [0], msg: 'La cantidad reservada no puede ser negativa' }
        },
        comment: 'Suma de stock apartado por reservas activas'
    },
    cantidadEnTransito: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad_en_transito',
        allowNull: false,
        defaultValue: 0.000,
        comment: 'Stock comprado a proveedor que aún no llega'
    },
    // ==========================================
    // UMBRALES POR BODEGA
    // ==========================================
    stockMinimoBodega: {
        type: DataTypes.INTEGER,
        field: 'stock_minimo_bodega',
        allowNull: true,
        comment: 'Umbral mínimo específico para esta bodega (override del producto)'
    },
    stockMaximoBodega: {
        type: DataTypes.INTEGER,
        field: 'stock_maximo_bodega',
        allowNull: true,
        comment: 'Capacidad máxima en esta bodega'
    },
    puntoReorden: {
        type: DataTypes.INTEGER,
        field: 'punto_reorden',
        allowNull: true,
        comment: 'Nivel en el que se debe reordenar el producto'
    },
    // ==========================================
    // COSTEO
    // ==========================================
    costoPromedio: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_promedio',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo promedio ponderado actual en esta bodega'
    },
    valorTotalInventario: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'valor_total_inventario',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'cantidadFisica * costoPromedio (cacheado)'
    },
    // ==========================================
    // UBICACIÓN FÍSICA DENTRO DE LA BODEGA
    // ==========================================
    ubicacionFisica: {
        type: DataTypes.STRING(100),
        field: 'ubicacion_fisica',
        allowNull: true,
        comment: 'Pasillo, estante o sección donde se almacena (ej: A-12-3)'
    },
    // ==========================================
    // FECHAS DE ACTIVIDAD
    // ==========================================
    fechaUltimaEntrada: {
        type: DataTypes.DATE,
        field: 'fecha_ultima_entrada',
        allowNull: true
    },
    fechaUltimaSalida: {
        type: DataTypes.DATE,
        field: 'fecha_ultima_salida',
        allowNull: true
    },
    fechaUltimoConteo: {
        type: DataTypes.DATE,
        field: 'fecha_ultimo_conteo',
        allowNull: true,
        comment: 'Cuándo se hizo el último inventario físico'
    }
}, {
    tableName: 'stock_producto',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['id_producto', 'id_bodega'],
            name: 'idx_unique_producto_bodega'
        },
        {
            fields: ['id_empresa', 'id_bodega']
        },
        {
            fields: ['id_empresa', 'id_producto']
        }
    ]
});

/**
 * Calcula la cantidad realmente disponible para vender
 * Física menos lo ya reservado
 */
StockProducto.prototype.cantidadDisponible = function() {
    const fisica = parseFloat(this.cantidadFisica);
    const reservada = parseFloat(this.cantidadReservada);
    return Math.max(0, fisica - reservada);
};

/**
 * Verifica si hay stock disponible para una cantidad solicitada
 *
 * @param {number} cantidadSolicitada - Cantidad que se quiere apartar o vender
 * @returns {boolean}
 */
StockProducto.prototype.tieneDisponible = function(cantidadSolicitada) {
    return this.cantidadDisponible() >= parseFloat(cantidadSolicitada);
};

/**
 * Verifica si el stock está bajo el umbral mínimo
 */
StockProducto.prototype.tieneStockBajo = function() {
    const minimo = this.stockMinimoBodega;
    if (minimo === null || minimo === undefined) return false;
    return parseFloat(this.cantidadFisica) <= minimo;
};

/**
 * Verifica si llegó al punto de reorden
 */
StockProducto.prototype.necesitaReorden = function() {
    if (this.puntoReorden === null || this.puntoReorden === undefined) return false;
    return parseFloat(this.cantidadFisica) <= this.puntoReorden;
};

/**
 * Recalcula y actualiza el valor total del inventario en esta bodega
 */
StockProducto.prototype.recalcularValorTotal = function() {
    const fisica = parseFloat(this.cantidadFisica);
    const costo = parseFloat(this.costoPromedio);
    this.valorTotalInventario = Math.round(fisica * costo * 100) / 100;
};

/**
 * Devuelve un resumen del stock para mostrar al usuario
 */
StockProducto.prototype.resumen = function() {
    return {
        idStockProducto: this.idStockProducto,
        idProducto: this.idProducto,
        idBodega: this.idBodega,
        cantidadFisica: parseFloat(this.cantidadFisica),
        cantidadReservada: parseFloat(this.cantidadReservada),
        cantidadDisponible: this.cantidadDisponible(),
        cantidadEnTransito: parseFloat(this.cantidadEnTransito),
        costoPromedio: parseFloat(this.costoPromedio),
        valorTotalInventario: parseFloat(this.valorTotalInventario),
        tieneStockBajo: this.tieneStockBajo(),
        necesitaReorden: this.necesitaReorden(),
        ubicacionFisica: this.ubicacionFisica,
        fechaUltimaEntrada: this.fechaUltimaEntrada,
        fechaUltimaSalida: this.fechaUltimaSalida
    };
};

module.exports = StockProducto;