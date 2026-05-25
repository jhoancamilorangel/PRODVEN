const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ImagenProducto = sequelize.define('ImagenProducto', {
    idImagen: {
        type: DataTypes.CHAR(36),
        field: 'id_imagen',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        allowNull: false,
        comment: 'Producto al que pertenece la imagen'
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria (multi-tenancy y organización en Cloudinary)'
    },
    // ==========================================
    // URLs DE LOS TRES TAMAÑOS (Cloudinary)
    // ==========================================
    urlOriginal: {
        type: DataTypes.TEXT,
        field: 'url_original',
        allowNull: false,
        comment: 'URL de la imagen en tamaño grande/original optimizado'
    },
    urlMedio: {
        type: DataTypes.TEXT,
        field: 'url_medio',
        allowNull: true,
        comment: 'URL de la imagen en tamaño medio (catálogo)'
    },
    urlThumbnail: {
        type: DataTypes.TEXT,
        field: 'url_thumbnail',
        allowNull: true,
        comment: 'URL de la imagen en miniatura (listados, carrito)'
    },
    publicId: {
        type: DataTypes.STRING(255),
        field: 'public_id',
        allowNull: false,
        comment: 'ID interno de Cloudinary, necesario para eliminar la imagen'
    },
    // ==========================================
    // METADATOS DE LA IMAGEN
    // ==========================================
    nombreArchivo: {
        type: DataTypes.STRING(255),
        field: 'nombre_archivo',
        allowNull: true,
        comment: 'Nombre original del archivo subido'
    },
    formato: {
        type: DataTypes.STRING(10),
        field: 'formato',
        allowNull: true,
        comment: 'Formato de la imagen (jpg, png, webp)'
    },
    tamanoBytes: {
        type: DataTypes.INTEGER,
        field: 'tamano_bytes',
        allowNull: true,
        comment: 'Peso del archivo original en bytes'
    },
    ancho: {
        type: DataTypes.INTEGER,
        field: 'ancho',
        allowNull: true,
        comment: 'Ancho de la imagen original en píxeles'
    },
    alto: {
        type: DataTypes.INTEGER,
        field: 'alto',
        allowNull: true,
        comment: 'Alto de la imagen original en píxeles'
    },
    textoAlternativo: {
        type: DataTypes.STRING(255),
        field: 'texto_alternativo',
        allowNull: true,
        comment: 'Texto alt para accesibilidad y SEO'
    },
    // ==========================================
    // ORGANIZACIÓN Y ESTADO
    // ==========================================
    esPrincipal: {
        type: DataTypes.BOOLEAN,
        field: 'es_principal',
        allowNull: false,
        defaultValue: false,
        comment: 'Si es la imagen principal del producto (solo una por producto)'
    },
    ordenVisualizacion: {
        type: DataTypes.INTEGER,
        field: 'orden_visualizacion',
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden de la imagen en la galería del producto'
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
    tableName: 'imagenes_producto',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            fields: ['id_producto', 'activo']
        },
        {
            fields: ['id_producto', 'es_principal']
        },
        {
            fields: ['id_producto', 'orden_visualizacion']
        }
    ]
});

/**
 * Devuelve la mejor URL disponible según el tamaño solicitado
 * Si el tamaño pedido no existe, cae al original como respaldo
 * 
 * @param {string} tamano - 'thumbnail', 'medio' u 'original'
 * @returns {string} URL de la imagen
 */
ImagenProducto.prototype.obtenerUrl = function(tamano = 'medio') {
    switch (tamano) {
        case 'thumbnail':
            return this.urlThumbnail || this.urlMedio || this.urlOriginal;
        case 'medio':
            return this.urlMedio || this.urlOriginal;
        case 'original':
        default:
            return this.urlOriginal;
    }
};

/**
 * Devuelve los datos públicos de la imagen para el marketplace
 */
ImagenProducto.prototype.datosPublicos = function() {
    return {
        idImagen: this.idImagen,
        urlOriginal: this.urlOriginal,
        urlMedio: this.urlMedio,
        urlThumbnail: this.urlThumbnail,
        textoAlternativo: this.textoAlternativo,
        esPrincipal: this.esPrincipal,
        ordenVisualizacion: this.ordenVisualizacion
    };
};

/**
 * Devuelve un objeto con las tres URLs juntas
 * Conveniente para el frontend que usa srcset responsivo
 */
ImagenProducto.prototype.todasLasUrls = function() {
    return {
        thumbnail: this.urlThumbnail,
        medio: this.urlMedio,
        original: this.urlOriginal
    };
};

module.exports = ImagenProducto;