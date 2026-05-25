const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Proveedor = sequelize.define('Proveedor', {
    idProveedor: {
        type: DataTypes.CHAR(36),
        field: 'id_proveedor',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria del proveedor (multi-tenancy)'
    },
    nombre: {
        type: DataTypes.STRING(150),
        field: 'nombre',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre del proveedor no puede estar vacío' },
            len: { args: [2, 150], msg: 'El nombre debe tener entre 2 y 150 caracteres' }
        }
    },
    razonSocial: {
        type: DataTypes.STRING(200),
        field: 'razon_social',
        allowNull: true
    },
    nit: {
        type: DataTypes.STRING(50),
        field: 'nit',
        allowNull: true,
        comment: 'Documento fiscal del proveedor'
    },
    tipoDocumento: {
        type: DataTypes.ENUM('NIT', 'RUT', 'CIF', 'RFC', 'CUIT', 'CC', 'OTRO'),
        field: 'tipo_documento',
        allowNull: true,
        defaultValue: 'NIT'
    },
    // ==========================================
    // CONTACTO
    // ==========================================
    nombreContacto: {
        type: DataTypes.STRING(150),
        field: 'nombre_contacto',
        allowNull: true,
        comment: 'Persona de contacto en el proveedor'
    },
    correo: {
        type: DataTypes.STRING(150),
        field: 'correo',
        allowNull: true,
        validate: {
            isEmailOrEmpty(value) {
                if (value && value.length > 0) {
                    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                    if (!regex.test(value)) {
                        throw new Error('El correo no tiene un formato válido');
                    }
                }
            }
        }
    },
    telefono: {
        type: DataTypes.STRING(20),
        field: 'telefono',
        allowNull: true
    },
    telefonoSecundario: {
        type: DataTypes.STRING(20),
        field: 'telefono_secundario',
        allowNull: true
    },
    sitioWeb: {
        type: DataTypes.STRING(255),
        field: 'sitio_web',
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
    // TÉRMINOS COMERCIALES
    // ==========================================
    condicionPago: {
        type: DataTypes.ENUM('contado', 'credito_15', 'credito_30', 'credito_60', 'credito_90', 'otro'),
        field: 'condicion_pago',
        allowNull: false,
        defaultValue: 'contado',
        comment: 'Términos de pago acordados con el proveedor'
    },
    diasCredito: {
        type: DataTypes.INTEGER,
        field: 'dias_credito',
        allowNull: false,
        defaultValue: 0,
        comment: 'Días de crédito otorgados por el proveedor'
    },
    moneda: {
        type: DataTypes.STRING(3),
        field: 'moneda',
        allowNull: false,
        defaultValue: 'COP'
    },
    tiempoEntregaDias: {
        type: DataTypes.INTEGER,
        field: 'tiempo_entrega_dias',
        allowNull: true,
        comment: 'Días promedio de entrega del proveedor'
    },
    pedidoMinimo: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'pedido_minimo',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Monto mínimo de pedido que exige el proveedor'
    },
    // ==========================================
    // DATOS BANCARIOS (para pagos)
    // ==========================================
    datosBancarios: {
        type: DataTypes.JSON,
        field: 'datos_bancarios',
        allowNull: true,
        defaultValue: {},
        comment: 'Objeto con banco, tipo de cuenta, número, titular'
    },
    // ==========================================
    // EVALUACIÓN
    // ==========================================
    calificacion: {
        type: DataTypes.DECIMAL(3, 2),
        field: 'calificacion',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Calificación interna del proveedor (0 a 5)'
    },
    notas: {
        type: DataTypes.TEXT,
        field: 'notas',
        allowNull: true,
        comment: 'Notas internas sobre el proveedor'
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
    tableName: 'proveedores',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            fields: ['id_empresa', 'activo']
        },
        {
            fields: ['id_empresa', 'nombre']
        }
    ]
});

/**
 * Verifica si el proveedor está disponible para operaciones
 */
Proveedor.prototype.estaDisponible = function() {
    return this.activo === true && this.eliminado === false;
};

/**
 * Devuelve los métodos de contacto disponibles del proveedor
 */
Proveedor.prototype.contactosDisponibles = function() {
    const contactos = {};
    if (this.correo) contactos.correo = this.correo;
    if (this.telefono) contactos.telefono = this.telefono;
    if (this.telefonoSecundario) contactos.telefonoSecundario = this.telefonoSecundario;
    if (this.nombreContacto) contactos.persona = this.nombreContacto;
    return contactos;
};

/**
 * Verifica si el proveedor maneja crédito
 */
Proveedor.prototype.manejaCredito = function() {
    return this.condicionPago !== 'contado' && this.diasCredito > 0;
};

module.exports = Proveedor;