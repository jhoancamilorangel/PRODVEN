const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ItemCarrito = sequelize.define('ItemCarrito', {
    idItem: {
        type: DataTypes.CHAR(36),
        field: 'id_item',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idCarrito: {
        type: DataTypes.CHAR(36),
        field: 'id_carrito',
        allowNull: false,
        comment: 'Carrito al que pertenece este item'
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: false,
        comment: 'Producto agregado al carrito'
    },
    cantidad: {
        type: DataTypes.INTEGER,
        field: 'cantidad',
        allowNull: false,
        defaultValue: 1,
        validate: {
            min: { args: [1], msg: 'La cantidad debe ser al menos 1' }
        }
    },
    precioUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'precio_unitario',
        allowNull: false,
        comment: 'Precio del producto al momento de agregarlo'
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
        comment: 'Notas del cliente sobre este item (ej: sin cebolla)'
    }
}, {
    tableName: 'items_carrito',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_carrito'] },
        { fields: ['id_producto'] }
    ]
});

/**
 * Calcula el subtotal del item según cantidad, precio y descuento
 */
ItemCarrito.prototype.calcularSubtotal = function() {
    const cantidad = parseInt(this.cantidad, 10) || 0;
    const precio = parseFloat(this.precioUnitario) || 0;
    const descuento = parseFloat(this.descuento) || 0;

    const subtotal = (cantidad * precio) - descuento;
    this.subtotal = Math.round((subtotal < 0 ? 0 : subtotal) * 100) / 100;
    return parseFloat(this.subtotal);
};

/**
 * Devuelve los datos del item para mostrar
 */
ItemCarrito.prototype.datosCompletos = function() {
    return {
        idItem: this.idItem,
        idCarrito: this.idCarrito,
        idProducto: this.idProducto,
        cantidad: this.cantidad,
        precioUnitario: parseFloat(this.precioUnitario),
        descuento: parseFloat(this.descuento),
        subtotal: parseFloat(this.subtotal),
        notas: this.notas,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = ItemCarrito;