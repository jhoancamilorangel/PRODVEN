const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Pago = sequelize.define('Pago', {
    idPago: {
        type: DataTypes.CHAR(36),
        field: 'id_pago',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria (multi-tenancy)'
    },
    tipoPago: {
        type: DataTypes.ENUM('pedido', 'suscripcion'),
        field: 'tipo_pago',
        allowNull: false,
        defaultValue: 'pedido',
        comment: 'Qué se está pagando'
    },
    idPedido: {
        type: DataTypes.CHAR(36),
        field: 'id_pedido',
        allowNull: true,
        comment: 'Pedido asociado (si tipo_pago es pedido)'
    },
    idSuscripcion: {
        type: DataTypes.CHAR(36),
        field: 'id_suscripcion',
        allowNull: true,
        comment: 'Suscripción asociada (si tipo_pago es suscripcion)'
    },
    monto: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'monto',
        allowNull: false,
        validate: {
            min: { args: [0.01], msg: 'El monto debe ser mayor a cero' }
        }
    },
    moneda: {
        type: DataTypes.STRING(3),
        field: 'moneda',
        allowNull: false,
        defaultValue: 'COP'
    },
    metodo: {
        type: DataTypes.ENUM(
            'tarjeta_credito',
            'tarjeta_debito',
            'pse',
            'efectivo',
            'efecty',
            'baloto',
            'nequi',
            'daviplata',
            'transferencia'
        ),
        field: 'metodo',
        allowNull: false
    },
    estado: {
        type: DataTypes.ENUM(
            'pendiente',
            'en_proceso',
            'completado',
            'fallido',
            'rechazado',
            'cancelado',
            'reembolso',
            'expirado'
        ),
        field: 'estado',
        allowNull: false,
        defaultValue: 'pendiente'
    },
    referencia: {
        type: DataTypes.STRING(100),
        field: 'referencia',
        allowNull: true,
        comment: 'Referencia interna del pago'
    },
    referenciaPayu: {
        type: DataTypes.STRING(150),
        field: 'referencia_payu',
        allowNull: true,
        comment: 'Referencia que conecta con la transacción en PayU'
    },
    fechaPago: {
        type: DataTypes.DATE,
        field: 'fecha_pago',
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    creadoPor: {
        type: DataTypes.CHAR(36),
        field: 'creado_por',
        allowNull: false,
        comment: 'Usuario que originó el pago'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        allowNull: false,
        defaultValue: true
    },
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        allowNull: false,
        defaultValue: false
    }
}, {
    tableName: 'pagos',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_empresa', 'estado'] },
        { fields: ['id_pedido'] },
        { fields: ['id_suscripcion'] },
        { fields: ['referencia_payu'] }
    ]
});

/**
 * Verifica si el pago está en un estado final (no cambia más)
 */
Pago.prototype.esEstadoFinal = function() {
    return ['completado', 'reembolso', 'cancelado', 'expirado'].includes(this.estado);
};

/**
 * Verifica si el pago fue exitoso
 */
Pago.prototype.fueExitoso = function() {
    return this.estado === 'completado';
};

/**
 * Verifica si el pago puede reembolsarse
 */
Pago.prototype.puedeReembolsarse = function() {
    return this.estado === 'completado';
};

/**
 * Devuelve una etiqueta legible del estado
 */
Pago.prototype.etiquetaEstado = function() {
    const etiquetas = {
        pendiente: 'Pendiente',
        en_proceso: 'En proceso',
        completado: 'Completado',
        fallido: 'Fallido',
        rechazado: 'Rechazado',
        cancelado: 'Cancelado',
        reembolso: 'Reembolsado',
        expirado: 'Expirado'
    };
    return etiquetas[this.estado] || this.estado;
};

/**
 * Devuelve los datos del pago para mostrar
 */
Pago.prototype.datosCompletos = function() {
    return {
        idPago: this.idPago,
        tipoPago: this.tipoPago,
        idPedido: this.idPedido,
        idSuscripcion: this.idSuscripcion,
        monto: parseFloat(this.monto),
        moneda: this.moneda,
        metodo: this.metodo,
        estado: this.estado,
        etiquetaEstado: this.etiquetaEstado(),
        referencia: this.referencia,
        referenciaPayu: this.referenciaPayu,
        fechaPago: this.fechaPago,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = Pago;