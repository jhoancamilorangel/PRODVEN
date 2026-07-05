const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

/**
 * Modelo SolicitudNegocio
 *
 * Guarda las solicitudes de clientes que quieren convertirse en negocio
 * dentro de ProdVen (onboarding de vendedores).
 *
 * Flujo:
 *  1. Un usuario con rol 'cliente' crea una solicitud (estado 'pendiente').
 *  2. El superadmin la revisa y la aprueba o rechaza.
 *  3. Al aprobar: se crea la empresa real, el usuario pasa a 'administrador'
 *     y se vincula a esa empresa. Se guarda idEmpresaCreada como referencia.
 *  4. Al rechazar: se guarda el motivo y el usuario sigue siendo cliente.
 *
 * NO creamos la empresa hasta que se apruebe: aquí solo viven los datos
 * PROPUESTOS por el solicitante, no una empresa real todavía.
 */
const SolicitudNegocio = sequelize.define('SolicitudNegocio', {
    idSolicitud: {
        type: DataTypes.CHAR(36),
        field: 'id_solicitud',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: false,
        comment: 'Usuario (cliente) que hace la solicitud'
    },

    // ----- Datos propuestos de la empresa -----
    nombreNegocio: {
        type: DataTypes.STRING(150),
        field: 'nombre_negocio',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre del negocio no puede estar vacío' },
            len: { args: [2, 150], msg: 'El nombre debe tener entre 2 y 150 caracteres' }
        }
    },
    categoria: {
        type: DataTypes.STRING(100),
        field: 'categoria',
        allowNull: true
    },
    telefono: {
        type: DataTypes.STRING(20),
        field: 'telefono',
        allowNull: true
    },
    ciudad: {
        type: DataTypes.STRING(100),
        field: 'ciudad',
        allowNull: true
    },
    departamento: {
        type: DataTypes.STRING(100),
        field: 'departamento',
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true,
        comment: 'Descripción del negocio o motivo de la solicitud'
    },

    // ----- Estado y resolución -----
    estado: {
        type: DataTypes.ENUM('pendiente', 'aprobada', 'rechazada'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'pendiente'
    },
    motivoRechazo: {
        type: DataTypes.TEXT,
        field: 'motivo_rechazo',
        allowNull: true,
        comment: 'Razón del rechazo, si aplica'
    },
    idEmpresaCreada: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa_creada',
        allowNull: true,
        comment: 'Empresa creada al aprobar la solicitud (referencia)'
    },
    revisadaPor: {
        type: DataTypes.CHAR(36),
        field: 'revisada_por',
        allowNull: true,
        comment: 'SuperAdmin que aprobó o rechazó la solicitud'
    },
    fechaRevision: {
        type: DataTypes.DATE,
        field: 'fecha_revision',
        allowNull: true
    }
}, {
    tableName: 'solicitudes_negocio',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_usuario'] },
        { fields: ['estado'] }
    ]
});

/**
 * Devuelve los datos de la solicitud para mostrar
 */
SolicitudNegocio.prototype.datosCompletos = function() {
    return {
        idSolicitud: this.idSolicitud,
        idUsuario: this.idUsuario,
        nombreNegocio: this.nombreNegocio,
        categoria: this.categoria,
        telefono: this.telefono,
        ciudad: this.ciudad,
        departamento: this.departamento,
        descripcion: this.descripcion,
        estado: this.estado,
        motivoRechazo: this.motivoRechazo,
        idEmpresaCreada: this.idEmpresaCreada,
        fechaCreacion: this.fecha_creacion,
        fechaRevision: this.fechaRevision
    };
};

module.exports = SolicitudNegocio;