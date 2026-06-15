const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ZonaCobertura = sequelize.define('ZonaCobertura', {
    idZona: {
        type: DataTypes.CHAR(36),
        field: 'id_zona',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa dueña de la zona de cobertura'
    },
    nombre: {
        type: DataTypes.STRING(100),
        field: 'nombre',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre de la zona no puede estar vacío' }
        }
    },
    tipo: {
        type: DataTypes.ENUM('circulo', 'poligono', 'ciudad', 'barrio'),
        field: 'tipo',
        allowNull: false,
        defaultValue: 'circulo'
    },
    latitudCentro: {
        type: DataTypes.DECIMAL(10, 8),
        field: 'latitud_centro',
        allowNull: true,
        comment: 'Latitud del centro (para zonas tipo círculo)'
    },
    longitudCentro: {
        type: DataTypes.DECIMAL(11, 8),
        field: 'longitud_centro',
        allowNull: true,
        comment: 'Longitud del centro (para zonas tipo círculo)'
    },
    radioKm: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'radio_km',
        allowNull: true,
        comment: 'Radio en kilómetros (para zonas tipo círculo)'
    },
    poligonoGeojson: {
        type: DataTypes.JSON,
        field: 'poligono_geojson',
        allowNull: true,
        comment: 'Coordenadas del polígono en formato GeoJSON (para zonas tipo polígono)'
    },
    costoAdicional: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_adicional',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Costo extra de domicilio para esta zona'
    },
    tiempoEstimadoMin: {
        type: DataTypes.INTEGER,
        field: 'tiempo_estimado_min',
        allowNull: false,
        defaultValue: 30,
        comment: 'Tiempo estimado de entrega en minutos'
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        allowNull: false,
        defaultValue: true
    }
}, {
    tableName: 'zonas_cobertura',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        { fields: ['id_empresa', 'activo'] },
        { fields: ['id_empresa', 'tipo'] }
    ]
});

/**
 * Calcula la distancia en kilómetros entre dos puntos geográficos
 * usando la fórmula de Haversine (distancia sobre la superficie terrestre)
 *
 * @param {number} lat1 - Latitud del punto 1
 * @param {number} lon1 - Longitud del punto 1
 * @param {number} lat2 - Latitud del punto 2
 * @param {number} lon2 - Longitud del punto 2
 * @returns {number} Distancia en kilómetros
 */
ZonaCobertura.calcularDistanciaKm = function(lat1, lon1, lat2, lon2) {
    const radioTierra = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return radioTierra * c;
};

/**
 * Verifica si un punto (lat, long) está dentro de esta zona
 * Por ahora solo maneja zonas tipo círculo
 *
 * @param {number} latitud - Latitud del punto a verificar
 * @param {number} longitud - Longitud del punto a verificar
 * @returns {boolean} true si el punto está dentro de la zona
 */
ZonaCobertura.prototype.contienePunto = function(latitud, longitud) {
    if (this.tipo === 'circulo') {
        if (this.latitudCentro === null || this.longitudCentro === null || this.radioKm === null) {
            return false;
        }

        const distancia = ZonaCobertura.calcularDistanciaKm(
            parseFloat(this.latitudCentro),
            parseFloat(this.longitudCentro),
            parseFloat(latitud),
            parseFloat(longitud)
        );

        return distancia <= parseFloat(this.radioKm);
    }

    // Polígono y otros tipos: preparado para el futuro
    return false;
};

/**
 * Devuelve los datos de la zona para mostrar
 */
ZonaCobertura.prototype.datosCompletos = function() {
    return {
        idZona: this.idZona,
        idEmpresa: this.idEmpresa,
        nombre: this.nombre,
        tipo: this.tipo,
        latitudCentro: this.latitudCentro ? parseFloat(this.latitudCentro) : null,
        longitudCentro: this.longitudCentro ? parseFloat(this.longitudCentro) : null,
        radioKm: this.radioKm ? parseFloat(this.radioKm) : null,
        costoAdicional: parseFloat(this.costoAdicional),
        tiempoEstimadoMin: this.tiempoEstimadoMin,
        activo: this.activo
    };
};

module.exports = ZonaCobertura;