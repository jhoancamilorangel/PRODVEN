const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const LogActividad = sequelize.define('LogActividad', {
    idLog: {
        type: DataTypes.CHAR(36),
        field: 'id_log',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: true,
        comment: 'Usuario que realizó la actividad'
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: true,
        comment: 'Empresa en cuyo contexto ocurrió la actividad'
    },
    accion: {
        type: DataTypes.STRING(100),
        field: 'accion',
        allowNull: false,
        comment: 'Acción realizada (ej: login, exportar_reporte)'
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true
    },
    ip: {
        type: DataTypes.STRING(45),
        field: 'ip',
        allowNull: true
    },
    dispositivo: {
        type: DataTypes.STRING(255),
        field: 'dispositivo',
        allowNull: true,
        comment: 'Información del dispositivo/navegador'
    },
    datosExtra: {
        type: DataTypes.JSON,
        field: 'datos_extra',
        allowNull: true,
        comment: 'Datos adicionales del contexto'
    }
}, {
    tableName: 'logs_actividad',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_usuario'] },
        { fields: ['id_empresa'] },
        { fields: ['fecha_creacion'] }
    ]
});

/**
 * Devuelve los datos del log para mostrar
 */
LogActividad.prototype.datosCompletos = function() {
    return {
        idLog: this.idLog,
        idUsuario: this.idUsuario,
        idEmpresa: this.idEmpresa,
        accion: this.accion,
        descripcion: this.descripcion,
        ip: this.ip,
        dispositivo: this.dispositivo,
        datosExtra: this.datosExtra,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = LogActividad;