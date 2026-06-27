const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../../config/database');

const InvBodega = sequelize.define('InvBodega', {
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(150),
        field: 'nombre',
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING(30),
        field: 'codigo',
        allowNull: true
    },
    descripcion: {
        type: DataTypes.STRING(255),
        field: 'descripcion',
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING(255),
        field: 'direccion',
        allowNull: true
    },
    esPrincipal: {
        type: DataTypes.BOOLEAN,
        field: 'es_principal',
        allowNull: false,
        defaultValue: false
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
    tableName: 'inv_bodegas',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

module.exports = InvBodega;