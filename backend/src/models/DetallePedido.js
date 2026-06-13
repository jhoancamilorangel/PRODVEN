const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const DetallePedido = sequelize.define('DetallePedido', {
    idDetalle: {
        type: DataTypes.CHAR(36),
        field: 'id_detalle',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idPedido: {
        type: DataTypes.CHAR(36),
        field: 'id_pedido',
        allowNull: false,
        comment: 'Pedido al que pertenece esta línea'
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: false,
        comment: 'Producto pedido'
    },
    cantidad: {
        type: DataTypes.INTEGER,
        field: 'cantidad',
        allowNull: false,
        validate: {
            min: { args: [1], msg: 'La cantidad debe ser al menos 1' }
        }
    },
    precioUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'precio_unitario',
        allowNull: false,
        comment: 'Precio del producto al momento del pedido (snapshot)'
    },
    descuento: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'descuento',
        allowNull: false,
        defaultValue: 0.00
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'subtotal',
        allowNull: false,
        comment: 'cantidad * precio_unitario - descuento'
    },
    notas: {
        type: DataTypes.TEXT,
        field: 'notas',
        allowNull: true,
        comment: 'Notas del cliente sobre este producto'
    }
}, {
    tableName: 'detalles_pedido',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_pedido'] },
        { fields: ['id_producto'] }
    ]
});

/**
 * Devuelve los datos del detalle para mostrar
 */
DetallePedido.prototype.datosCompletos = function() {
    return {
        idDetalle: this.idDetalle,
        idPedido: this.idPedido,
        idProducto: this.idProducto,
        cantidad: this.cantidad,
        precioUnitario: parseFloat(this.precioUnitario),
        descuento: parseFloat(this.descuento),
        subtotal: parseFloat(this.subtotal),
        notas: this.notas
    };
};

module.exports = DetallePedido;