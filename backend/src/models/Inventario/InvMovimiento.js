const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../../config/database');

const InvMovimiento = sequelize.define('InvMovimiento', {
    idMovimiento: {
        type: DataTypes.CHAR(36),
        field: 'id_movimiento',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false
    },
    idArticulo: {
        type: DataTypes.CHAR(36),
        field: 'id_articulo',
        allowNull: false
    },
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        allowNull: false
    },
    idBodegaDestino: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega_destino',
        allowNull: true
    },
    tipo: {
        type: DataTypes.STRING(20),
        field: 'tipo',
        allowNull: false
    },
    motivo: {
        type: DataTypes.STRING(200),
        field: 'motivo',
        allowNull: true
    },
    cantidad: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'cantidad',
        allowNull: false
    },
    stockAnterior: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'stock_anterior',
        allowNull: false,
        defaultValue: 0
    },
    stockNuevo: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'stock_nuevo',
        allowNull: false,
        defaultValue: 0
    },
    costoUnitario: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_unitario',
        allowNull: false,
        defaultValue: 0
    },
    costoTotal: {
        type: DataTypes.DECIMAL(16, 2),
        field: 'costo_total',
        allowNull: false,
        defaultValue: 0
    },
    costoPromedioResultante: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_promedio_resultante',
        allowNull: false,
        defaultValue: 0
    },
    idLote: {
        type: DataTypes.CHAR(36),
        field: 'id_lote',
        allowNull: true
    },
    documentoSoporte: {
        type: DataTypes.STRING(100),
        field: 'documento_soporte',
        allowNull: true
    },
    idProveedor: {
        type: DataTypes.CHAR(36),
        field: 'id_proveedor',
        allowNull: true
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: true
    },
    nombreUsuario: {
        type: DataTypes.STRING(150),
        field: 'nombre_usuario',
        allowNull: true
    },
    observaciones: {
        type: DataTypes.TEXT,
        field: 'observaciones',
        allowNull: true
    }
}, {
    tableName: 'inv_movimientos',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true
});

/**
 * Determina si un tipo de movimiento suma o resta stock
 */
InvMovimiento.esEntrada = function(tipo) {
    return ['entrada', 'ajuste_positivo'].includes(tipo);
};
/**
 * Datos del movimiento para el kardex
 */
InvMovimiento.prototype.datosKardex = function() {
    return {
        idMovimiento: this.idMovimiento,
        tipo: this.tipo,
        motivo: this.motivo,
        cantidad: parseFloat(this.cantidad),
        stockAnterior: parseFloat(this.stockAnterior),
        stockNuevo: parseFloat(this.stockNuevo),
        costoUnitario: parseFloat(this.costoUnitario),
        costoTotal: parseFloat(this.costoTotal),
        documentoSoporte: this.documentoSoporte,
        nombreUsuario: this.nombreUsuario,
        observaciones: this.observaciones,
        fechaCreacion: this.getDataValue('fecha_creacion') || this.fechaCreacion || this.createdAt
    };
};

module.exports = InvMovimiento;