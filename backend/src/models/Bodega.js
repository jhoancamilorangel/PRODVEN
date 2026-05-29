const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Bodega = sequelize.define('Bodega', {
    idBodega: {
        type: DataTypes.CHAR(36),
        field: 'id_bodega',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria de la bodega (multi-tenancy)'
    },
    // ==========================================
    // IDENTIFICACIÓN
    // ==========================================
    nombre: {
        type: DataTypes.STRING(100),
        field: 'nombre',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre de la bodega no puede estar vacío' },
            len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres' }
        }
    },
    codigo: {
        type: DataTypes.STRING(20),
        field: 'codigo',
        allowNull: true,
        comment: 'Código corto único por empresa (ej: PRIN, SUC1)'
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true
    },
    // ==========================================
    // UBICACIÓN
    // ==========================================
    direccion: {
        type: DataTypes.STRING(255),
        field: 'direccion',
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
    pais: {
        type: DataTypes.STRING(100),
        field: 'pais',
        allowNull: false,
        defaultValue: 'Colombia'
    },
    // ==========================================
    // RESPONSABLE
    // ==========================================
    idResponsable: {
        type: DataTypes.CHAR(36),
        field: 'id_responsable',
        allowNull: true,
        comment: 'Usuario responsable de la bodega'
    },
    telefonoContacto: {
        type: DataTypes.STRING(20),
        field: 'telefono_contacto',
        allowNull: true
    },
    // ==========================================
    // CONFIGURACIÓN
    // ==========================================
    esPrincipal: {
        type: DataTypes.BOOLEAN,
        field: 'es_principal',
        allowNull: false,
        defaultValue: false,
        comment: 'Bodega principal de la empresa (solo una por empresa)'
    },
    permiteVentas: {
        type: DataTypes.BOOLEAN,
        field: 'permite_ventas',
        allowNull: false,
        defaultValue: true,
        comment: 'Si se puede vender desde esta bodega'
    },
    permiteProduccion: {
        type: DataTypes.BOOLEAN,
        field: 'permite_produccion',
        allowNull: false,
        defaultValue: true,
        comment: 'Si se puede consumir materiales para producción aquí'
    },
    // ==========================================
    // ESTADO
    // ==========================================
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
    tableName: 'bodegas',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            fields: ['id_empresa', 'activo']
        },
        {
            unique: true,
            fields: ['id_empresa', 'codigo'],
            name: 'idx_unique_codigo_bodega_por_empresa',
            where: {
                codigo: { [require('sequelize').Op.ne]: null }
            }
        }
    ]
});

/**
 * Verifica si la bodega está operativa
 */
Bodega.prototype.estaOperativa = function() {
    return this.activo === true && this.eliminado === false;
};

/**
 * Verifica si la bodega puede usarse para ventas
 */
Bodega.prototype.puedeVender = function() {
    return this.estaOperativa() && this.permiteVentas === true;
};

/**
 * Verifica si la bodega puede usarse para producción
 */
Bodega.prototype.puedeProducir = function() {
    return this.estaOperativa() && this.permiteProduccion === true;
};

/**
 * Devuelve los datos resumidos de la bodega
 */
Bodega.prototype.resumen = function() {
    return {
        idBodega: this.idBodega,
        nombre: this.nombre,
        codigo: this.codigo,
        ciudad: this.ciudad,
        esPrincipal: this.esPrincipal,
        activo: this.activo
    };
};

module.exports = Bodega;