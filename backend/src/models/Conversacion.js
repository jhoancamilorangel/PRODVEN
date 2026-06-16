const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Conversacion = sequelize.define('Conversacion', {
    idConversacion: {
        type: DataTypes.CHAR(36),
        field: 'id_conversacion',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa dueña de la conversación (multi-tenancy)'
    },
    tipo: {
        type: DataTypes.ENUM('interna', 'cliente'),
        field: 'tipo',
        allowNull: false,
        defaultValue: 'cliente',
        comment: 'interna: entre personal; cliente: con un cliente'
    },
    asunto: {
        type: DataTypes.STRING(255),
        field: 'asunto',
        allowNull: true,
        comment: 'Tema de la conversación'
    },
    estado: {
        type: DataTypes.ENUM('activa', 'archivada', 'cerrada'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'activa'
    },
    ultimoMensaje: {
        type: DataTypes.TEXT,
        field: 'ultimo_mensaje',
        allowNull: true,
        comment: 'Preview del último mensaje, para listar conversaciones'
    },
    fechaUltimoMensaje: {
        type: DataTypes.DATE,
        field: 'fecha_ultimo_mensaje',
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'conversaciones',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_empresa', 'tipo'] },
        { fields: ['id_empresa', 'estado'] },
        { fields: ['fecha_ultimo_mensaje'] }
    ]
});

/**
 * Devuelve los datos de la conversación para mostrar
 */
Conversacion.prototype.datosCompletos = function() {
    return {
        idConversacion: this.idConversacion,
        idEmpresa: this.idEmpresa,
        tipo: this.tipo,
        asunto: this.asunto,
        estado: this.estado,
        ultimoMensaje: this.ultimoMensaje,
        fechaUltimoMensaje: this.fechaUltimoMensaje,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = Conversacion;