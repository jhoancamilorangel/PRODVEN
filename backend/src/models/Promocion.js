const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Promocion = sequelize.define('Promocion', {
    idPromocion: {
        type: DataTypes.CHAR(36),
        field: 'id_promocion',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa dueña de la promoción (multi-tenancy)'
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: true,
        comment: 'Producto específico, o null si es promoción general'
    },
    nombre: {
        type: DataTypes.STRING(150),
        field: 'nombre',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre de la promoción es obligatorio' }
        }
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true
    },
    tipo: {
        type: DataTypes.ENUM('porcentaje', 'valor_fijo', '2x1', 'envio_gratis'),
        field: 'tipo',
        allowNull: false,
        comment: 'Tipo de descuento'
    },
    valor: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'valor',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Para porcentaje: 0-100. Para valor_fijo: monto del descuento'
    },
    codigo: {
        type: DataTypes.STRING(50),
        field: 'codigo',
        allowNull: true,
        comment: 'Código promocional opcional (único). Si es null, es automática'
    },
    usoMaximo: {
        type: DataTypes.INTEGER,
        field: 'uso_maximo',
        allowNull: true,
        comment: 'Máximo de usos permitidos. Null = ilimitado'
    },
    usoActual: {
        type: DataTypes.INTEGER,
        field: 'uso_actual',
        allowNull: false,
        defaultValue: 0,
        comment: 'Cuántas veces se ha usado'
    },
    fechaInicio: {
        type: DataTypes.DATE,
        field: 'fecha_inicio',
        allowNull: false,
        comment: 'Desde cuándo es válida'
    },
    fechaFin: {
        type: DataTypes.DATE,
        field: 'fecha_fin',
        allowNull: false,
        comment: 'Hasta cuándo es válida'
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
    tableName: 'promociones',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_empresa', 'activo'] },
        { fields: ['codigo'] },
        { fields: ['id_producto'] }
    ]
});

/**
 * Verifica si la promoción está vigente (fecha actual entre inicio y fin)
 */
Promocion.prototype.estaVigente = function() {
    const ahora = new Date();
    return ahora >= new Date(this.fechaInicio) && ahora <= new Date(this.fechaFin);
};

/**
 * Verifica si la promoción tiene usos disponibles
 */
Promocion.prototype.tieneUsosDisponibles = function() {
    if (this.usoMaximo === null) {
        return true; // ilimitada
    }
    return this.usoActual < this.usoMaximo;
};

/**
 * Calcula el descuento que aplica esta promoción sobre un monto
 * Solo maneja porcentaje y valor_fijo (los implementados a fondo)
 *
 * @param {number} monto - El monto sobre el que se calcula el descuento
 * @returns {number} El valor del descuento (no el total final)
 */
Promocion.prototype.calcularDescuento = function(monto) {
    const base = parseFloat(monto);
    const valor = parseFloat(this.valor);

    if (this.tipo === 'porcentaje') {
        // valor es el porcentaje (ej: 15 = 15%)
        const descuento = base * (valor / 100);
        return Math.round(descuento * 100) / 100; // redondeo a 2 decimales
    }

    if (this.tipo === 'valor_fijo') {
        // valor es el monto a descontar, sin pasarse del total
        return Math.min(valor, base);
    }

    // 2x1 y envio_gratis: preparados, su lógica se afina al conectar con pedidos
    return 0;
};

/**
 * Devuelve los datos de la promoción para mostrar
 */
Promocion.prototype.datosCompletos = function() {
    return {
        idPromocion: this.idPromocion,
        idEmpresa: this.idEmpresa,
        idProducto: this.idProducto,
        nombre: this.nombre,
        descripcion: this.descripcion,
        tipo: this.tipo,
        valor: parseFloat(this.valor),
        codigo: this.codigo,
        usoMaximo: this.usoMaximo,
        usoActual: this.usoActual,
        fechaInicio: this.fechaInicio,
        fechaFin: this.fechaFin,
        activo: this.activo,
        vigente: this.estaVigente()
    };
};

module.exports = Promocion;