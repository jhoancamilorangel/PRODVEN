const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../../config/database');

const InvLote = sequelize.define('InvLote', {
    idLote: {
        type: DataTypes.CHAR(36),
        field: 'id_lote',
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
    numeroLote: {
        type: DataTypes.STRING(80),
        field: 'numero_lote',
        allowNull: false
    },
    fechaFabricacion: {
        type: DataTypes.DATEONLY,
        field: 'fecha_fabricacion',
        allowNull: true
    },
    fechaVencimiento: {
        type: DataTypes.DATEONLY,
        field: 'fecha_vencimiento',
        allowNull: true
    },
    cantidadInicial: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'cantidad_inicial',
        allowNull: false,
        defaultValue: 0
    },
    cantidadActual: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'cantidad_actual',
        allowNull: false,
        defaultValue: 0
    },
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
    tableName: 'inv_lotes',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

module.exports = InvLote;