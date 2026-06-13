const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const SeguimientoPedido = sequelize.define('SeguimientoPedido', {
    idSeguimiento: {
        type: DataTypes.CHAR(36),
        field: 'id_seguimiento',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idPedido: {
        type: DataTypes.CHAR(36),
        field: 'id_pedido',
        allowNull: false,
        comment: 'Pedido al que pertenece este registro de seguimiento'
    },
    estado: {
        type: DataTypes.ENUM(
            'pendiente',
            'confirmado',
            'en_preparacion',
            'en_camino',
            'entregado',
            'cancelado',
            'reembolsado'
        ),
        field: 'estado',
        allowNull: false,
        comment: 'Estado al que pasó el pedido en este punto'
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true,
        comment: 'Descripción o nota del cambio de estado'
    },
    latitud: {
        type: DataTypes.DECIMAL(10, 8),
        field: 'latitud',
        allowNull: true,
        comment: 'Ubicación GPS en este punto del seguimiento'
    },
    longitud: {
        type: DataTypes.DECIMAL(11, 8),
        field: 'longitud',
        allowNull: true
    },
    registradoPor: {
        type: DataTypes.CHAR(36),
        field: 'registrado_por',
        allowNull: false,
        comment: 'Usuario que registró este cambio de estado'
    }
}, {
    tableName: 'seguimiento_pedido',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_pedido', 'fecha_creacion'] }
    ]
});

/**
 * Devuelve los datos del seguimiento para mostrar
 */
SeguimientoPedido.prototype.datosCompletos = function() {
    return {
        idSeguimiento: this.idSeguimiento,
        idPedido: this.idPedido,
        estado: this.estado,
        descripcion: this.descripcion,
        latitud: this.latitud ? parseFloat(this.latitud) : null,
        longitud: this.longitud ? parseFloat(this.longitud) : null,
        registradoPor: this.registradoPor,
        fecha: this.fecha_creacion
    };
};

module.exports = SeguimientoPedido;