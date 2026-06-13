const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Pedido = sequelize.define('Pedido', {
    idPedido: {
        type: DataTypes.CHAR(36),
        field: 'id_pedido',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa que vende (multi-tenancy)'
    },
    idCliente: {
        type: DataTypes.CHAR(36),
        field: 'id_cliente',
        allowNull: false,
        comment: 'Cliente global que compra'
    },
    idDireccion: {
        type: DataTypes.CHAR(36),
        field: 'id_direccion',
        allowNull: true,
        comment: 'Dirección de entrega seleccionada'
    },
    idPromocion: {
        type: DataTypes.CHAR(36),
        field: 'id_promocion',
        allowNull: true
    },
    numeroPedido: {
        type: DataTypes.STRING(50),
        field: 'numero_pedido',
        allowNull: false,
        comment: 'Número legible único del pedido (ej: PED-2026-00001)'
    },
    tipoEntrega: {
        type: DataTypes.ENUM('domicilio', 'recogida', 'en_sitio'),
        field: 'tipo_entrega',
        allowNull: false,
        defaultValue: 'domicilio'
    },
    tipoPago: {
        type: DataTypes.ENUM('digital', 'contra_entrega', 'mixto'),
        field: 'tipo_pago',
        allowNull: false,
        defaultValue: 'digital'
    },
    estado: {
        type: DataTypes.ENUM(
            'pendiente',
            'confirmado',
            'en_preparacion',
            'en_camino',
            'entregado',
            'cancelado',
            'reembolsado'
        ),
        field: 'estado',
        allowNull: false,
        defaultValue: 'pendiente'
    },
    subtotal: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'subtotal',
        allowNull: false,
        defaultValue: 0.00
    },
    descuento: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'descuento',
        allowNull: false,
        defaultValue: 0.00
    },
    impuestos: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'impuestos',
        allowNull: false,
        defaultValue: 0.00
    },
    costoDomicilio: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_domicilio',
        allowNull: false,
        defaultValue: 0.00
    },
    total: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'total',
        allowNull: false,
        defaultValue: 0.00
    },
    notas: {
        type: DataTypes.TEXT,
        field: 'notas',
        allowNull: true,
        comment: 'Notas del cliente sobre el pedido'
    },
    direccionEnvio: {
        type: DataTypes.TEXT,
        field: 'direccion_envio',
        allowNull: true,
        comment: 'Snapshot de la dirección de entrega en texto'
    },
    latitudEntrega: {
        type: DataTypes.DECIMAL(10, 8),
        field: 'latitud_entrega',
        allowNull: true
    },
    longitudEntrega: {
        type: DataTypes.DECIMAL(11, 8),
        field: 'longitud_entrega',
        allowNull: true
    },
    fechaPedido: {
        type: DataTypes.DATE,
        field: 'fecha_pedido',
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    fechaConfirmacion: {
        type: DataTypes.DATE,
        field: 'fecha_confirmacion',
        allowNull: true
    },
    fechaEntregaReal: {
        type: DataTypes.DATE,
        field: 'fecha_entrega_real',
        allowNull: true
    },
    creadoPor: {
        type: DataTypes.CHAR(36),
        field: 'creado_por',
        allowNull: false,
        comment: 'Usuario que creó el pedido'
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
    tableName: 'pedidos',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_empresa', 'estado'] },
        { fields: ['id_cliente'] },
        { unique: true, fields: ['numero_pedido'] },
        { fields: ['fecha_pedido'] }
    ]
});

/**
 * Estados válidos y sus transiciones permitidas
 */
Pedido.TRANSICIONES = {
    pendiente: ['confirmado', 'cancelado'],
    confirmado: ['en_preparacion', 'cancelado'],
    en_preparacion: ['en_camino', 'cancelado'],
    en_camino: ['entregado', 'cancelado'],
    entregado: ['reembolsado'],
    cancelado: [],
    reembolsado: []
};

/**
 * Verifica si se puede transicionar a un nuevo estado
 */
Pedido.prototype.puedeTransicionarA = function(nuevoEstado) {
    const permitidos = Pedido.TRANSICIONES[this.estado] || [];
    return permitidos.includes(nuevoEstado);
};

/**
 * Verifica si el pedido se puede cancelar
 */
Pedido.prototype.sePuedeCancelar = function() {
    return ['pendiente', 'confirmado', 'en_preparacion', 'en_camino'].includes(this.estado);
};

/**
 * Devuelve una etiqueta legible del estado
 */
Pedido.prototype.etiquetaEstado = function() {
    const etiquetas = {
        pendiente: 'Pendiente',
        confirmado: 'Confirmado',
        en_preparacion: 'En preparación',
        en_camino: 'En camino',
        entregado: 'Entregado',
        cancelado: 'Cancelado',
        reembolsado: 'Reembolsado'
    };
    return etiquetas[this.estado] || this.estado;
};

/**
 * Devuelve los datos del pedido para mostrar
 */
Pedido.prototype.datosCompletos = function() {
    return {
        idPedido: this.idPedido,
        idEmpresa: this.idEmpresa,
        idCliente: this.idCliente,
        numeroPedido: this.numeroPedido,
        tipoEntrega: this.tipoEntrega,
        tipoPago: this.tipoPago,
        estado: this.estado,
        etiquetaEstado: this.etiquetaEstado(),
        subtotal: parseFloat(this.subtotal),
        descuento: parseFloat(this.descuento),
        impuestos: parseFloat(this.impuestos),
        costoDomicilio: parseFloat(this.costoDomicilio),
        total: parseFloat(this.total),
        notas: this.notas,
        direccionEnvio: this.direccionEnvio,
        latitudEntrega: this.latitudEntrega ? parseFloat(this.latitudEntrega) : null,
        longitudEntrega: this.longitudEntrega ? parseFloat(this.longitudEntrega) : null,
        fechaPedido: this.fecha_pedido,
        fechaConfirmacion: this.fecha_confirmacion,
        fechaEntregaReal: this.fecha_entrega_real
    };
};

module.exports = Pedido;