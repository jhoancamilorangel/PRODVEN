const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Domiciliario = sequelize.define('Domiciliario', {
    idDomiciliario: {
        type: DataTypes.CHAR(36),
        field: 'id_domiciliario',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa para la que trabaja el domiciliario'
    },
    idUsuario: {
        type: DataTypes.CHAR(36),
        field: 'id_usuario',
        allowNull: false,
        comment: 'Usuario del sistema vinculado al domiciliario'
    },
    tipoVehiculo: {
        type: DataTypes.ENUM('moto', 'carro', 'bicicleta', 'pie'),
        field: 'tipo_vehiculo',
        allowNull: false,
        defaultValue: 'moto'
    },
    placa: {
        type: DataTypes.STRING(20),
        field: 'placa',
        allowNull: true
    },
    documentoIdentidad: {
        type: DataTypes.STRING(20),
        field: 'documento_identidad',
        allowNull: false
    },
    licenciaConduccion: {
        type: DataTypes.STRING(50),
        field: 'licencia_conduccion',
        allowNull: true
    },
    disponible: {
        type: DataTypes.BOOLEAN,
        field: 'disponible',
        allowNull: false,
        defaultValue: true,
        comment: 'Si está disponible para tomar pedidos'
    },
    ultimaLatitud: {
        type: DataTypes.DECIMAL(10, 8),
        field: 'ultima_latitud',
        allowNull: true,
        comment: 'Última posición conocida del domiciliario'
    },
    ultimaLongitud: {
        type: DataTypes.DECIMAL(11, 8),
        field: 'ultima_longitud',
        allowNull: true
    },
    ultimaActualizacion: {
        type: DataTypes.DATE,
        field: 'ultima_actualizacion',
        allowNull: true,
        comment: 'Cuándo reportó su posición por última vez'
    },
    calificacionPromedio: {
        type: DataTypes.DECIMAL(3, 2),
        field: 'calificacion_promedio',
        allowNull: false,
        defaultValue: 0.00
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'domiciliarios',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_empresa', 'disponible'] },
        { fields: ['id_usuario'] }
    ]
});

/**
 * Devuelve los datos del domiciliario para mostrar
 */
Domiciliario.prototype.datosCompletos = function() {
    return {
        idDomiciliario: this.idDomiciliario,
        idEmpresa: this.idEmpresa,
        idUsuario: this.idUsuario,
        tipoVehiculo: this.tipoVehiculo,
        placa: this.placa,
        documentoIdentidad: this.documentoIdentidad,
        licenciaConduccion: this.licenciaConduccion,
        disponible: this.disponible,
        ultimaLatitud: this.ultimaLatitud ? parseFloat(this.ultimaLatitud) : null,
        ultimaLongitud: this.ultimaLongitud ? parseFloat(this.ultimaLongitud) : null,
        ultimaActualizacion: this.ultimaActualizacion,
        calificacionPromedio: parseFloat(this.calificacionPromedio),
        activo: this.activo
    };
};

module.exports = Domiciliario;