const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../../config/database');

const InvCategoria = sequelize.define('InvCategoria', {
    idCategoria: {
        type: DataTypes.CHAR(36),
        field: 'id_categoria',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false
    },
    nombre: {
        type: DataTypes.STRING(120),
        field: 'nombre',
        allowNull: false
    },
    descripcion: {
        type: DataTypes.STRING(255),
        field: 'descripcion',
        allowNull: true
    },
    color: {
        type: DataTypes.STRING(20),
        field: 'color',
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
    tableName: 'inv_categorias',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

module.exports = InvCategoria;