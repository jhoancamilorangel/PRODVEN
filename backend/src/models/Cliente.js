const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Cliente = sequelize.define('Cliente', {
    idCliente: {
        type: DataTypes.CHAR(36),
        field: 'id_cliente',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: false,
        comment: 'Usuario del sistema vinculado a este cliente'
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: true,
        comment: 'Empresa a la que pertenece el cliente'
    },
    empresa: {
        type: DataTypes.STRING(150),
        field: 'empresa',
        allowNull: true,
        comment: 'Nombre de empresa del cliente, si es cliente corporativo'
    },
    nit: {
        type: DataTypes.STRING(20),
        field: 'nit',
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        field: 'telefono',
        allowNull: true
    },
    correo: {
        type: DataTypes.STRING(150),
        field: 'correo',
        allowNull: true
    },
    fechaNacimiento: {
        type: DataTypes.DATEONLY,
        field: 'fecha_nacimiento',
        allowNull: true
    },
    genero: {
        type: DataTypes.ENUM('masculino', 'femenino', 'otro', 'prefiero_no_decir'),
        field: 'genero',
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
    tableName: 'clientes',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_usuario'] },
        { fields: ['id_empresa'] }
    ]
});

/**
 * Devuelve los datos del cliente para mostrar
 */
Cliente.prototype.datosCompletos = function() {
    return {
        idCliente: this.idCliente,
        idUsuario: this.idUsuario,
        idEmpresa: this.idEmpresa,
        empresa: this.empresa,
        nit: this.nit,
        telefono: this.telefono,
        correo: this.correo,
        activo: this.activo
    };
};

module.exports = Cliente;