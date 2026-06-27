const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../../config/database');

const InvArticulo = sequelize.define('InvArticulo', {
    idArticulo: {
        type: DataTypes.CHAR(36),
        field: 'id_articulo',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false
    },
    idCategoria: {
        type: DataTypes.CHAR(36),
        field: 'id_categoria',
        allowNull: true
    },
    idProveedor: {
        type: DataTypes.CHAR(36),
        field: 'id_proveedor',
        allowNull: true
    },
    nombre: {
        type: DataTypes.STRING(200),
        field: 'nombre',
        allowNull: false
    },
    codigoInterno: {
        type: DataTypes.STRING(60),
        field: 'codigo_interno',
        allowNull: true
    },
    codigoBarras: {
        type: DataTypes.STRING(60),
        field: 'codigo_barras',
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true
    },
    unidadMedida: {
        type: DataTypes.STRING(20),
        field: 'unidad_medida',
        allowNull: false,
        defaultValue: 'unidad'
    },
    stockMinimo: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'stock_minimo',
        allowNull: false,
        defaultValue: 0
    },
    stockMaximo: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'stock_maximo',
        allowNull: true
    },
    puntoReorden: {
        type: DataTypes.DECIMAL(14, 3),
        field: 'punto_reorden',
        allowNull: true
    },
    costoPromedio: {
        type: DataTypes.DECIMAL(14, 2),
        field: 'costo_promedio',
        allowNull: false,
        defaultValue: 0
    },
    controlaLotes: {
        type: DataTypes.BOOLEAN,
        field: 'controla_lotes',
        allowNull: false,
        defaultValue: false
    },
    imagen: {
        type: DataTypes.STRING(255),
        field: 'imagen',
        allowNull: true
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
    tableName: 'inv_articulos',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

/**
 * Genera un código interno automático
 */
InvArticulo.generarCodigo = function(prefijo = 'ART') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const aleatorio = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefijo}-${timestamp}-${aleatorio}`;
};

module.exports = InvArticulo;