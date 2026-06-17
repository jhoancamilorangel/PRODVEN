const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const RegistroAuditoria = sequelize.define('RegistroAuditoria', {
    idRegistro: {
        type: DataTypes.CHAR(36),
        field: 'id_registro',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: true,
        comment: 'Empresa donde ocurrió la acción (null para acciones del sistema)'
    },
    entidad: {
        type: DataTypes.STRING(100),
        field: 'entidad',
        allowNull: false,
        comment: 'Tabla/entidad afectada (ej: productos, pedidos)'
    },
    idEntidad: {
        type: DataTypes.CHAR(36),
        field: 'id_entidad',
        allowNull: false,
        comment: 'ID del registro afectado'
    },
    accion: {
        type: DataTypes.ENUM('INSERT', 'UPDATE', 'DELETE'),
        field: 'accion',
        allowNull: false,
        comment: 'Tipo de operación realizada'
    },
    valorAnterior: {
        type: DataTypes.JSON,
        field: 'valor_anterior',
        allowNull: true,
        comment: 'Estado del registro antes del cambio'
    },
    valorNuevo: {
        type: DataTypes.JSON,
        field: 'valor_nuevo',
        allowNull: true,
        comment: 'Estado del registro después del cambio'
    },
    realizadoPor: {
        type: DataTypes.CHAR(36),
        field: 'realizado_por',
        allowNull: true,
        comment: 'Usuario que realizó la acción'
    },
    ip: {
        type: DataTypes.STRING(45),
        field: 'ip',
        allowNull: true,
        comment: 'Dirección IP desde donde se hizo la acción'
    }
}, {
    tableName: 'registros_auditoria',
    timestamps: true,
    createdAt: 'fecha_accion',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_empresa'] },
        { fields: ['entidad', 'id_entidad'] },
        { fields: ['realizado_por'] },
        { fields: ['fecha_accion'] }
    ]
});

/**
 * Devuelve los datos del registro de auditoría para mostrar
 */
RegistroAuditoria.prototype.datosCompletos = function() {
    return {
        idRegistro: this.idRegistro,
        idEmpresa: this.idEmpresa,
        entidad: this.entidad,
        idEntidad: this.idEntidad,
        accion: this.accion,
        valorAnterior: this.valorAnterior,
        valorNuevo: this.valorNuevo,
        realizadoPor: this.realizadoPor,
        ip: this.ip,
        fechaAccion: this.fecha_accion
    };
};

module.exports = RegistroAuditoria;