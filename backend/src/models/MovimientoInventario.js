const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const MovimientoInventario = sequelize.define('MovimientoInventario', {
    idMovimiento: {
        type: DataTypes.CHAR(36),
        field: 'id_movimiento',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria del movimiento (multi-tenancy)'
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: false,
        comment: 'Producto afectado por el movimiento'
    },
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        allowNull: true,
        comment: 'Bodega donde ocurre el movimiento (preparado para multi-bodega)'
    },
    // ==========================================
    // TIPO Y NATURALEZA DEL MOVIMIENTO
    // ==========================================
    tipo: {
        type: DataTypes.ENUM(
            'entrada_compra',
            'entrada_produccion',
            'entrada_devolucion',
            'entrada_ajuste',
            'entrada_inicial',
            'salida_venta',
            'salida_produccion',
            'salida_merma',
            'salida_ajuste',
            'salida_devolucion_proveedor'
        ),
        field: 'tipo',
        allowNull: false,
        comment: 'Tipo específico de movimiento'
    },
    naturaleza: {
        type: DataTypes.ENUM('entrada', 'salida'),
        field: 'naturaleza',
        allowNull: false,
        comment: 'Si suma o resta stock. Se deriva del tipo'
    },
    // ==========================================
    // CANTIDADES Y SALDOS
    // ==========================================
    cantidad: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'cantidad',
        allowNull: false,
        validate: {
            min: { args: [0.001], msg: 'La cantidad debe ser mayor a cero' }
        },
        comment: 'Cantidad de unidades movidas (siempre positiva)'
    },
    stockAnterior: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'stock_anterior',
        allowNull: false,
        comment: 'Stock que tenía el producto antes del movimiento'
    },
    stockNuevo: {
        type: DataTypes.DECIMAL(12, 3),
        field: 'stock_nuevo',
        allowNull: false,
        comment: 'Stock que queda después del movimiento'
    },
    // ==========================================
    // COSTOS (para costeo promedio ponderado)
    // ==========================================
    costoUnitario: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_unitario',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo por unidad en este movimiento (relevante en entradas)'
    },
    costoTotal: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_total',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo total del movimiento (cantidad * costoUnitario)'
    },
    costoPromedioResultante: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_promedio_resultante',
        allowNull: true,
        comment: 'Costo promedio ponderado del producto después del movimiento'
    },
    // ==========================================
    // LOTES Y VENCIMIENTO (estructura preparada)
    // ==========================================
    numeroLote: {
        type: DataTypes.STRING(50),
        field: 'numero_lote',
        allowNull: true,
        comment: 'Número de lote, para trazabilidad de perecederos'
    },
    fechaVencimiento: {
        type: DataTypes.DATEONLY,
        field: 'fecha_vencimiento',
        allowNull: true,
        comment: 'Fecha de vencimiento del lote, si aplica'
    },
    // ==========================================
    // REFERENCIAS Y TRAZABILIDAD
    // ==========================================
    referenciaTipo: {
        type: DataTypes.STRING(50),
        field: 'referencia_tipo',
        allowNull: true,
        comment: 'Entidad que originó el movimiento (pedido, orden_produccion, compra)'
    },
    referenciaId: {
        type: DataTypes.CHAR(36),
        field: 'referencia_id',
        allowNull: true,
        comment: 'ID de la entidad que originó el movimiento'
    },
    idProveedor: {
        type: DataTypes.CHAR(36),
        field: 'id_proveedor',
        allowNull: true,
        comment: 'Proveedor asociado, en entradas por compra'
    },
    documentoSoporte: {
        type: DataTypes.STRING(100),
        field: 'documento_soporte',
        allowNull: true,
        comment: 'Número de factura o documento que respalda el movimiento'
    },
    // ==========================================
    // MOTIVO Y RESPONSABLE
    // ==========================================
    motivo: {
        type: DataTypes.STRING(255),
        field: 'motivo',
        allowNull: true,
        comment: 'Descripción del motivo del movimiento'
    },
    observaciones: {
        type: DataTypes.TEXT,
        field: 'observaciones',
        allowNull: true
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: true,
        comment: 'Usuario que registró el movimiento'
    },
    nombreUsuario: {
        type: DataTypes.STRING(150),
        field: 'nombre_usuario',
        allowNull: true,
        comment: 'Nombre del usuario al momento del movimiento (snapshot histórico)'
    }
}, {
    tableName: 'movimientos_inventario',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true,
    indexes: [
        {
            fields: ['id_empresa', 'id_producto', 'fecha_creacion']
        },
        {
            fields: ['id_producto', 'fecha_creacion']
        },
        {
            fields: ['id_empresa', 'tipo']
        },
        {
            fields: ['referencia_tipo', 'referencia_id']
        }
    ]
});

/**
 * Mapa que relaciona cada tipo de movimiento con su naturaleza
 * Permite derivar automáticamente si suma o resta stock
 */
MovimientoInventario.TIPOS_ENTRADA = [
    'entrada_compra',
    'entrada_produccion',
    'entrada_devolucion',
    'entrada_ajuste',
    'entrada_inicial'
];

MovimientoInventario.TIPOS_SALIDA = [
    'salida_venta',
    'salida_produccion',
    'salida_merma',
    'salida_ajuste',
    'salida_devolucion_proveedor'
];

/**
 * Deriva la naturaleza (entrada/salida) a partir del tipo de movimiento
 *
 * @param {string} tipo - Tipo de movimiento
 * @returns {string} 'entrada' o 'salida'
 */
MovimientoInventario.derivarNaturaleza = function(tipo) {
    if (MovimientoInventario.TIPOS_ENTRADA.includes(tipo)) {
        return 'entrada';
    }
    if (MovimientoInventario.TIPOS_SALIDA.includes(tipo)) {
        return 'salida';
    }
    throw new Error(`Tipo de movimiento desconocido: ${tipo}`);
};

/**
 * Verifica si un tipo de movimiento es una entrada
 *
 * @param {string} tipo - Tipo de movimiento
 * @returns {boolean}
 */
MovimientoInventario.esEntrada = function(tipo) {
    return MovimientoInventario.TIPOS_ENTRADA.includes(tipo);
};

/**
 * Devuelve una etiqueta legible del tipo de movimiento
 */
MovimientoInventario.prototype.etiquetaTipo = function() {
    const etiquetas = {
        entrada_compra: 'Entrada por compra',
        entrada_produccion: 'Entrada por producción',
        entrada_devolucion: 'Devolución de cliente',
        entrada_ajuste: 'Ajuste positivo',
        entrada_inicial: 'Inventario inicial',
        salida_venta: 'Salida por venta',
        salida_produccion: 'Consumo en producción',
        salida_merma: 'Merma o pérdida',
        salida_ajuste: 'Ajuste negativo',
        salida_devolucion_proveedor: 'Devolución a proveedor'
    };
    return etiquetas[this.tipo] || this.tipo;
};

/**
 * Devuelve los datos del movimiento formateados para el kardex
 */
MovimientoInventario.prototype.datosKardex = function() {
    return {
        idMovimiento: this.idMovimiento,
        fecha: this.fecha_creacion,
        tipo: this.tipo,
        etiqueta: this.etiquetaTipo(),
        naturaleza: this.naturaleza,
        cantidad: parseFloat(this.cantidad),
        stockAnterior: parseFloat(this.stockAnterior),
        stockNuevo: parseFloat(this.stockNuevo),
        costoUnitario: parseFloat(this.costoUnitario),
        costoTotal: parseFloat(this.costoTotal),
        motivo: this.motivo,
        documentoSoporte: this.documentoSoporte,
        nombreUsuario: this.nombreUsuario,
        numeroLote: this.numeroLote
    };
};

module.exports = MovimientoInventario;