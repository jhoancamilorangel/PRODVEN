const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../../config/database');

const InvStock = sequelize.define('InvStock', {
    idStock: {
        type: DataTypes.CHAR(36),
        field: 'id_stock',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false
    },
    idArticulo: {
        type: DataTypes.CHAR(36),
        field: 'id_articulo',
        allowNull: false
    },
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        allowNull: false
    },
    cantidadFisica: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'cantidad_fisica',
        allowNull: false,
        defaultValue: 0
    },
    cantidadReservada: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'cantidad_reservada',
        allowNull: false,
        defaultValue: 0
    },
    costoPromedio: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_promedio',
        allowNull: false,
        defaultValue: 0
    },
    valorTotal: {
        type: DataTypes.DECIMAL(16, 2),
        field: 'valor_total',
        allowNull: false,
        defaultValue: 0
    },
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
        allowNull: true
    }
}, {
    tableName: 'inv_stock',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

/**
 * Cantidad disponible = física - reservada
 */
InvStock.prototype.cantidadDisponible = function() {
    return parseFloat(this.cantidadFisica) - parseFloat(this.cantidadReservada);
};

/**
 * Recalcula el valor total del inventario (física * costo promedio)
 */
InvStock.prototype.recalcularValorTotal = function() {
    const valor = parseFloat(this.cantidadFisica) * parseFloat(this.costoPromedio);
    this.valorTotal = Math.round(valor * 100) / 100;
    return this.valorTotal;
};

/**
 * Resumen del stock para respuestas de la API
 */
InvStock.prototype.resumen = function() {
    return {
        idStock: this.idStock,
        idArticulo: this.idArticulo,
        idBodega: this.idBodega,
        cantidadFisica: parseFloat(this.cantidadFisica),
        cantidadReservada: parseFloat(this.cantidadReservada),
        cantidadDisponible: this.cantidadDisponible(),
        costoPromedio: parseFloat(this.costoPromedio),
        valorTotal: parseFloat(this.valorTotal),
        fechaUltimaEntrada: this.fechaUltimaEntrada,
        fechaUltimaSalida: this.fechaUltimaSalida,
        fechaUltimoConteo: this.fechaUltimoConteo
    };
};

module.exports = InvStock;