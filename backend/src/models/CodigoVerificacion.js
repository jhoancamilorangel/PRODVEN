const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const CodigoVerificacion = sequelize.define('CodigoVerificacion', {
    idCodigo: {
        type: DataTypes.CHAR(36),
        field: 'id_codigo',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: false
    },
    codigo: {
        type: DataTypes.STRING(10),
        field: 'codigo',
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM(
            'verificacion_correo',
            'recuperacion_password',
            '2fa',
            'cambio_correo'
        ),
        field: 'tipo',
        allowNull: false
    },
    usado: {
        type: DataTypes.BOOLEAN,
        field: 'usado',
        defaultValue: false
    },
    intentos: {
        type: DataTypes.INTEGER,
        field: 'intentos',
        defaultValue: 0
    },
    fechaExpiracion: {
        type: DataTypes.DATE,
        field: 'fecha_expiracion',
        allowNull: false
    }
}, {
    tableName: 'codigos_verificacion',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true
});

CodigoVerificacion.prototype.esValido = function() {
    return !this.usado && new Date() < this.fechaExpiracion && this.intentos < 5;
};

CodigoVerificacion.prototype.incrementarIntento = async function() {
    this.intentos += 1;
    await this.save();
};

module.exports = CodigoVerificacion;