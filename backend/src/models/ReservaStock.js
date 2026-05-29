const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ReservaStock = sequelize.define('ReservaStock', {
    idReserva: {
        type: DataTypes.CHAR(36),
        field: 'id_reserva',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria (multi-tenancy)'
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: false,
        comment: 'Producto cuyo stock está reservado'
    },
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        allowNull: true,
        comment: 'Bodega donde está el stock reservado'
    },
    // ==========================================
    // CANTIDAD RESERVADA
    // ==========================================
    cantidad: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad',
        allowNull: false,
        validate: {
            min: { args: [0.001], msg: 'La cantidad reservada debe ser mayor a cero' }
        }
    },
    // ==========================================
    // REFERENCIA AL ORIGEN DE LA RESERVA
    // ==========================================
    referenciaTipo: {
        type: DataTypes.ENUM('pedido', 'orden_produccion', 'manual'),
        field: 'referencia_tipo',
        allowNull: false,
        comment: 'Tipo de entidad que originó la reserva'
    },
    referenciaId: {
        type: DataTypes.CHAR(36),
        field: 'referencia_id',
        allowNull: false,
        comment: 'ID de la entidad que originó la reserva'
    },
    // ==========================================
    // ESTADO DE LA RESERVA
    // ==========================================
    estado: {
        type: DataTypes.ENUM('activa', 'confirmada', 'liberada', 'expirada'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'activa',
        comment: 'Estado actual de la reserva'
    },
    // ==========================================
    // TIEMPOS
    // ==========================================
    fechaExpiracion: {
        type: DataTypes.DATE,
        field: 'fecha_expiracion',
        allowNull: true,
        comment: 'Fecha y hora en que la reserva expira automáticamente'
    },
    fechaConfirmacion: {
        type: DataTypes.DATE,
        field: 'fecha_confirmacion',
        allowNull: true,
        comment: 'Cuándo se convirtió en salida real de inventario'
    },
    fechaLiberacion: {
        type: DataTypes.DATE,
        field: 'fecha_liberacion',
        allowNull: true,
        comment: 'Cuándo se liberó (pedido cancelado o expirado)'
    },
    // ==========================================
    // CONTEXTO Y RESPONSABLE
    // ==========================================
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: true,
        comment: 'Usuario que originó la reserva'
    },
    motivoLiberacion: {
        type: DataTypes.STRING(255),
        field: 'motivo_liberacion',
        allowNull: true,
        comment: 'Por qué se liberó la reserva, si aplica'
    },
    observaciones: {
        type: DataTypes.TEXT,
        field: 'observaciones',
        allowNull: true
    }
}, {
    tableName: 'reservas_stock',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            fields: ['id_empresa', 'id_producto', 'estado']
        },
        {
            fields: ['referencia_tipo', 'referencia_id']
        },
        {
            fields: ['estado', 'fecha_expiracion']
        }
    ]
});

/**
 * Verifica si la reserva está activa (consumiendo stock)
 */
ReservaStock.prototype.estaActiva = function() {
    return this.estado === 'activa';
};

/**
 * Verifica si la reserva ha expirado por tiempo
 */
ReservaStock.prototype.haExpirado = function() {
    if (!this.fechaExpiracion) return false;
    return new Date() > new Date(this.fechaExpiracion);
};

/**
 * Marca la reserva como confirmada (se convirtió en salida real)
 */
ReservaStock.prototype.confirmar = async function() {
    this.estado = 'confirmada';
    this.fechaConfirmacion = new Date();
    return await this.save();
};

/**
 * Libera la reserva devolviendo el stock al disponible
 */
ReservaStock.prototype.liberar = async function(motivo = null) {
    this.estado = 'liberada';
    this.fechaLiberacion = new Date();
    if (motivo) {
        this.motivoLiberacion = motivo;
    }
    return await this.save();
};

/**
 * Marca la reserva como expirada
 */
ReservaStock.prototype.expirar = async function() {
    this.estado = 'expirada';
    this.fechaLiberacion = new Date();
    this.motivoLiberacion = 'Expiración automática por tiempo';
    return await this.save();
};

/**
 * Devuelve un resumen de la reserva
 */
ReservaStock.prototype.resumen = function() {
    return {
        idReserva: this.idReserva,
        idProducto: this.idProducto,
        cantidad: parseFloat(this.cantidad),
        estado: this.estado,
        referenciaTipo: this.referenciaTipo,
        referenciaId: this.referenciaId,
        fechaCreacion: this.fecha_creacion,
        fechaExpiracion: this.fechaExpiracion
    };
};

module.exports = ReservaStock;