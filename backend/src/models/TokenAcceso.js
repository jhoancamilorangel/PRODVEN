const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const TokenAcceso = sequelize.define('TokenAcceso', {
    idToken: {
        type: DataTypes.CHAR(36),
        field: 'id_token',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: false
    },
    token: {
        type: DataTypes.TEXT,
        field: 'token',
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('access', 'refresh'),
        field: 'tipo',
        allowNull: false,
        defaultValue: 'access'
    },
    ipOrigen: {
        type: DataTypes.STRING(45),
        field: 'ip_origen',
        allowNull: true
    },
    dispositivo: {
        type: DataTypes.STRING(255),
        field: 'dispositivo',
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        defaultValue: true
    },
    fechaExpiracion: {
        type: DataTypes.DATE,
        field: 'fecha_expiracion',
        allowNull: false
    }
}, {
    tableName: 'tokens_acceso',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true
});

TokenAcceso.prototype.estaVigente = function() {
    return this.activo && new Date() < this.fechaExpiracion;
};

module.exports = TokenAcceso;