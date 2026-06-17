const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Notificacion = sequelize.define('Notificacion', {
    idNotificacion: {
        type: DataTypes.CHAR(36),
        field: 'id_notificacion',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: false,
        comment: 'Usuario destinatario de la notificación'
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: true,
        comment: 'Empresa relacionada, si aplica'
    },
    titulo: {
        type: DataTypes.STRING(150),
        field: 'titulo',
        allowNull: false
    },
    mensaje: {
        type: DataTypes.TEXT,
        field: 'mensaje',
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('pedido', 'pago', 'inventario', 'mensaje', 'sistema', 'promocion'),
        field: 'tipo',
        allowNull: false,
        defaultValue: 'sistema',
        comment: 'Categoría de la notificación (para mostrar ícono según el caso)'
    },
    canal: {
        type: DataTypes.ENUM('email', 'sms', 'push', 'sistema'),
        field: 'canal',
        allowNull: false,
        defaultValue: 'sistema',
        comment: 'Canal de envío. "sistema" es la notificación dentro de la app'
    },
    leida: {
        type: DataTypes.BOOLEAN,
        field: 'leida',
        allowNull: false,
        defaultValue: false
    },
    urlAccion: {
        type: DataTypes.TEXT,
        field: 'url_accion',
        allowNull: true,
        comment: 'A dónde lleva la notificación al tocarla'
    }
}, {
    tableName: 'notificaciones',
    timestamps: true,
    createdAt: 'fecha_envio',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_usuario', 'leida'] },
        { fields: ['id_usuario', 'fecha_envio'] }
    ]
});

/**
 * Devuelve los datos de la notificación para mostrar
 */
Notificacion.prototype.datosCompletos = function() {
    return {
        idNotificacion: this.idNotificacion,
        idUsuario: this.idUsuario,
        idEmpresa: this.idEmpresa,
        titulo: this.titulo,
        mensaje: this.mensaje,
        tipo: this.tipo,
        canal: this.canal,
        leida: this.leida,
        urlAccion: this.urlAccion,
        fechaEnvio: this.fecha_envio
    };
};

module.exports = Notificacion;