const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Mensaje = sequelize.define('Mensaje', {
    idMensaje: {
        type: DataTypes.CHAR(36),
        field: 'id_mensaje',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idConversacion: {
        type: DataTypes.CHAR(36),
        field: 'id_conversacion',
        allowNull: false,
        comment: 'Conversación a la que pertenece el mensaje'
    },
    idRemitente: {
        type: DataTypes.CHAR(36),
        field: 'id_remitente',
        allowNull: false,
        comment: 'Usuario que envió el mensaje'
    },
    contenido: {
        type: DataTypes.TEXT,
        field: 'contenido',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El mensaje no puede estar vacío' }
        }
    },
    tipoContenido: {
        type: DataTypes.ENUM('texto', 'imagen', 'archivo', 'audio', 'video'),
        field: 'tipo_contenido',
        allowNull: false,
        defaultValue: 'texto'
    },
    urlArchivo: {
        type: DataTypes.TEXT,
        field: 'url_archivo',
        allowNull: true,
        comment: 'URL del archivo adjunto (si el tipo no es texto)'
    },
    leido: {
        type: DataTypes.BOOLEAN,
        field: 'leido',
        allowNull: false,
        defaultValue: false
    },
    fechaLectura: {
        type: DataTypes.DATE,
        field: 'fecha_lectura',
        allowNull: true
    },
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'mensajes',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_conversacion', 'fecha_creacion'] },
        { fields: ['id_remitente'] },
        { fields: ['id_conversacion', 'leido'] }
    ]
});

/**
 * Devuelve los datos del mensaje para mostrar
 */
Mensaje.prototype.datosCompletos = function() {
    return {
        idMensaje: this.idMensaje,
        idConversacion: this.idConversacion,
        idRemitente: this.idRemitente,
        contenido: this.contenido,
        tipoContenido: this.tipoContenido,
        urlArchivo: this.urlArchivo,
        leido: this.leido,
        fechaLectura: this.fechaLectura,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = Mensaje;