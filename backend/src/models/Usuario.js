const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');
const bcrypt = require('bcrypt');

const Usuario = sequelize.define('Usuario', {
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: true
    },
    nombres: {
        type: DataTypes.STRING(100),
        field: 'nombres',
        allowNull: false
    },
    apellidos: {
        type: DataTypes.STRING(100),
        field: 'apellidos',
        allowNull: false
    },
    correo: {
        type: DataTypes.STRING(150),
        field: 'correo',
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true
        }
    },
    claveHash: {
        type: DataTypes.STRING(255),
        field: 'clave_hash',
        allowNull: false
    },
    telefono: {
        type: DataTypes.STRING(20),
        field: 'telefono',
        allowNull: true
    },
    avatarUrl: {
        type: DataTypes.TEXT,
        field: 'avatar_url',
        allowNull: true
    },
    rol: {
        type: DataTypes.ENUM(
            'superadmin',
            'administrador',
            'vendedor',
            'produccion',
            'supervisor',
            'cliente'
        ),
        field: 'rol',
        allowNull: false,
        defaultValue: 'cliente'
    },
    verificado: {
        type: DataTypes.BOOLEAN,
        field: 'verificado',
        defaultValue: false
    },
    twoFactorActivo: {
        type: DataTypes.BOOLEAN,
        field: 'two_factor_activo',
        defaultValue: false
    },
    twoFactorSecret: {
        type: DataTypes.STRING(255),
        field: 'two_factor_secret',
        allowNull: true
    },
    ultimoAcceso: {
        type: DataTypes.DATE,
        field: 'ultimo_acceso',
        allowNull: true
    },
    intentosFallidos: {
        type: DataTypes.INTEGER,
        field: 'intentos_fallidos',
        defaultValue: 0
    },
    bloqueadoHasta: {
        type: DataTypes.DATE,
        field: 'bloqueado_hasta',
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        defaultValue: true
    },
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        defaultValue: false
    }
}, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    hooks: {
        beforeCreate: async (usuario) => {
            if (usuario.claveHash) {
                const salt = await bcrypt.genSalt(12);
                usuario.claveHash = await bcrypt.hash(usuario.claveHash, salt);
            }
        },
        beforeUpdate: async (usuario) => {
            if (usuario.changed('claveHash')) {
                const salt = await bcrypt.genSalt(12);
                usuario.claveHash = await bcrypt.hash(usuario.claveHash, salt);
            }
        }
    }
});

Usuario.prototype.compararPassword = async function(passwordPlano) {
    return await bcrypt.compare(passwordPlano, this.claveHash);
};

Usuario.prototype.estaBloqueado = function() {
    return this.bloqueadoHasta && new Date() < this.bloqueadoHasta;
};

module.exports = Usuario;