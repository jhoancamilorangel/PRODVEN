const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Carrito = sequelize.define('Carrito', {
    idCarrito: {
        type: DataTypes.CHAR(36),
        field: 'id_carrito',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idCliente: {
        type: DataTypes.CHAR(36),
        field: 'id_cliente',
        allowNull: false,
        comment: 'Cliente dueño del carrito'
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa cuyos productos se están comprando'
    },
    idPromocion: {
        type: DataTypes.CHAR(36),
        field: 'id_promocion',
        allowNull: true,
        comment: 'Promoción aplicada al carrito, si hay'
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'subtotal',
        allowNull: false,
        defaultValue: 0.00
    },
    descuento: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'descuento',
        allowNull: false,
        defaultValue: 0.00
    },
    costoDomicilio: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_domicilio',
        allowNull: false,
        defaultValue: 0.00
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'total',
        allowNull: false,
        defaultValue: 0.00
    },
    estado: {
        type: DataTypes.ENUM('activo', 'abandonado', 'convertido'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'activo',
        comment: 'activo: en uso, abandonado: sin actividad, convertido: ya es pedido'
    }
}, {
    tableName: 'carrito',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_cliente', 'estado'] },
        { fields: ['id_empresa'] }
    ]
});

/**
 * Recalcula los totales del carrito a partir de sus items
 * Recibe la lista de items para sumar sus subtotales
 */
Carrito.prototype.recalcularTotales = function(items) {
    let subtotal = 0;
    let descuentoItems = 0;

    for (const item of items) {
        subtotal += parseFloat(item.subtotal);
        descuentoItems += parseFloat(item.descuento) || 0;
    }

    this.subtotal = Math.round(subtotal * 100) / 100;
    const descuentoTotal = descuentoItems + (parseFloat(this.descuento) || 0);
    const costoDomicilio = parseFloat(this.costoDomicilio) || 0;

    this.total = Math.round((subtotal - descuentoItems + costoDomicilio) * 100) / 100;

    if (this.total < 0) {
        this.total = 0;
    }
};

/**
 * Verifica si el carrito está vacío o puede operarse
 */
Carrito.prototype.estaActivo = function() {
    return this.estado === 'activo';
};

/**
 * Devuelve los datos del carrito para mostrar
 */
Carrito.prototype.datosCompletos = function() {
    return {
        idCarrito: this.idCarrito,
        idCliente: this.idCliente,
        idEmpresa: this.idEmpresa,
        idPromocion: this.idPromocion,
        subtotal: parseFloat(this.subtotal),
        descuento: parseFloat(this.descuento),
        costoDomicilio: parseFloat(this.costoDomicilio),
        total: parseFloat(this.total),
        estado: this.estado,
        fechaCreacion: this.fecha_creacion,
        fechaActualizacion: this.fecha_actualizacion
    };
};

module.exports = Carrito;