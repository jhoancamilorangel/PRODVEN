const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ParticipanteConversacion = sequelize.define('ParticipanteConversacion', {
    idParticipante: {
        type: DataTypes.CHAR(36),
        field: 'id_participante',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idConversacion: {
        type: DataTypes.CHAR(36),
        field: 'id_conversacion',
        allowNull: false,
        comment: 'Conversación a la que pertenece'
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: false,
        comment: 'Usuario participante'
    },
    rol: {
        type: DataTypes.STRING(50),
        field: 'rol',
        allowNull: false,
        defaultValue: 'cliente',
        comment: 'Rol del participante en la conversación'
    },
    fechaUltimoVisto: {
        type: DataTypes.DATE,
        field: 'fecha_ultimo_visto',
        allowNull: true,
        comment: 'Última vez que el participante vio la conversación (para no leídos)'
    }
}, {
    tableName: 'participantes_conversacion',
    timestamps: true,
    createdAt: 'fecha_ingreso',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_conversacion'] },
        { fields: ['id_usuario'] },
        { unique: true, fields: ['id_conversacion', 'id_usuario'], name: 'idx_unique_participante' }
    ]
});

/**
 * Devuelve los datos del participante
 */
ParticipanteConversacion.prototype.datosCompletos = function() {
    return {
        idParticipante: this.idParticipante,
        idConversacion: this.idConversacion,
        idUsuario: this.idUsuario,
        rol: this.rol,
        fechaUltimoVisto: this.fechaUltimoVisto,
        fechaIngreso: this.fecha_ingreso
    };
};

module.exports = ParticipanteConversacion;