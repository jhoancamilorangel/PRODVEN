const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Resena = sequelize.define('Resena', {
    idResena: {
        type: DataTypes.CHAR(36),
        field: 'id_resena',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa reseñada (multi-tenancy)'
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: true,
        comment: 'Producto reseñado (null si es reseña general de la empresa)'
    },
    idCliente: {
        type: DataTypes.CHAR(36),
        field: 'id_cliente',
        allowNull: false,
        comment: 'Cliente que deja la reseña'
    },
    idPedido: {
        type: DataTypes.CHAR(36),
        field: 'id_pedido',
        allowNull: true,
        comment: 'Pedido que respalda la compra (validación de compra)'
    },
    calificacion: {
        type: DataTypes.TINYINT,
        field: 'calificacion',
        allowNull: false,
        validate: {
            min: { args: [1], msg: 'La calificación mínima es 1' },
            max: { args: [5], msg: 'La calificación máxima es 5' }
        },
        comment: 'Estrellas de 1 a 5'
    },
    titulo: {
        type: DataTypes.STRING(150),
        field: 'titulo',
        allowNull: true
    },
    comentario: {
        type: DataTypes.TEXT,
        field: 'comentario',
        allowNull: true
    },
    visible: {
        type: DataTypes.BOOLEAN,
        field: 'visible',
        allowNull: false,
        defaultValue: true,
        comment: 'La empresa puede ocultar una reseña sin borrarla'
    },
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'resenas',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_empresa'] },
        { fields: ['id_producto'] },
        { fields: ['id_cliente'] },
        { fields: ['id_producto', 'visible', 'eliminado'] }
    ]
});

/**
 * Devuelve los datos de la reseña para mostrar
 */
Resena.prototype.datosCompletos = function() {
    return {
        idResena: this.idResena,
        idEmpresa: this.idEmpresa,
        idProducto: this.idProducto,
        idCliente: this.idCliente,
        idPedido: this.idPedido,
        calificacion: this.calificacion,
        titulo: this.titulo,
        comentario: this.comentario,
        visible: this.visible,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = Resena;