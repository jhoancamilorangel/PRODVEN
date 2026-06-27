const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../../config/database');

const InvProveedor = sequelize.define('InvProveedor', {
    idProveedor: {
        type: DataTypes.CHAR(36),
        field: 'id_proveedor',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(200),
        field: 'nombre',
        allowNull: false
    },
    nit: {
        type: DataTypes.STRING(50),
        field: 'nit',
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(30),
        field: 'telefono',
        allowNull: true
    },
    correo: {
        type: DataTypes.STRING(150),
        field: 'correo',
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING(255),
        field: 'direccion',
        allowNull: true
    },
    contacto: {
        type: DataTypes.STRING(150),
        field: 'contacto',
        allowNull: true
    },
    notas: {
        type: DataTypes.TEXT,
        field: 'notas',
        allowNull: true
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
    tableName: 'inv_proveedores',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

module.exports = InvProveedor;