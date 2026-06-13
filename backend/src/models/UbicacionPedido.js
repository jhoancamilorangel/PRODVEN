const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const UbicacionPedido = sequelize.define('UbicacionPedido', {
    idUbicacion: {
        type: DataTypes.CHAR(36),
        field: 'id_ubicacion',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idPedido: {
        type: DataTypes.CHAR(36),
        field: 'id_pedido',
        allowNull: false,
        comment: 'Pedido que se está rastreando'
    },
    idDomiciliario: {
        type: DataTypes.CHAR(36),
        field: 'id_domiciliario',
        allowNull: false,
        comment: 'Domiciliario que reporta la ubicación'
    },
    latitud: {
        type: DataTypes.DECIMAL(10, 8),
        field: 'latitud',
        allowNull: false
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8),
        field: 'longitud',
        allowNull: false
    },
    velocidad: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'velocidad',
        allowNull: true,
        comment: 'Velocidad del domiciliario en km/h, si se reporta'
    }
}, {
    tableName: 'ubicacion_pedido',
    timestamps: true,
    createdAt: 'fecha_registro',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_pedido', 'fecha_registro'] },
        { fields: ['id_domiciliario'] }
    ]
});

/**
 * Devuelve los datos de la ubicación para mostrar
 */
UbicacionPedido.prototype.datosCompletos = function() {
    return {
        idUbicacion: this.idUbicacion,
        idPedido: this.idPedido,
        idDomiciliario: this.idDomiciliario,
        latitud: parseFloat(this.latitud),
        longitud: parseFloat(this.longitud),
        velocidad: this.velocidad ? parseFloat(this.velocidad) : null,
        fechaRegistro: this.fecha_registro
    };
};

module.exports = UbicacionPedido;