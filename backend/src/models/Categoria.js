const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Categoria = sequelize.define('Categoria', {
    idCategoria: {
        type: DataTypes.CHAR(36),
        field: 'id_categoria',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria de la categoría (multi-tenancy)'
    },
    nombre: {
        type: DataTypes.STRING(100),
        field: 'nombre',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre de la categoría no puede estar vacío' },
            len: { args: [2, 100], msg: 'El nombre debe tener entre 2 y 100 caracteres' }
        }
    },
    slug: {
        type: DataTypes.STRING(120),
        field: 'slug',
        allowNull: true,
        comment: 'Versión URL-friendly del nombre, generado automáticamente'
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true
    },
    icono: {
        type: DataTypes.STRING(50),
        field: 'icono',
        allowNull: true,
        comment: 'Nombre del icono Lucide a mostrar (ej: ShoppingCart, Coffee)'
    },
    color: {
        type: DataTypes.STRING(7),
        field: 'color',
        allowNull: true,
        defaultValue: '#0A2A43',
        validate: {
            is: {
                args: /^#[0-9A-Fa-f]{6}$/,
                msg: 'El color debe estar en formato hexadecimal (#RRGGBB)'
            }
        }
    },
    imagenUrl: {
        type: DataTypes.TEXT,
        field: 'imagen_url',
        allowNull: true,
        comment: 'URL de la imagen de la categoría en Cloudinary'
    },
    imagenPublicId: {
        type: DataTypes.STRING(255),
        field: 'imagen_public_id',
        allowNull: true,
        comment: 'ID interno de Cloudinary para gestión de la imagen'
    },
    idCategoriaPadre: {
        type: DataTypes.CHAR(36),
        field: 'id_categoria_padre',
        allowNull: true,
        comment: 'Permite crear subcategorías (estructura jerárquica)'
    },
    ordenVisualizacion: {
        type: DataTypes.INTEGER,
        field: 'orden_visualizacion',
        allowNull: false,
        defaultValue: 0,
        comment: 'Orden en que aparece en el catálogo (menor número = primero)'
    },
    visibleEnMarketplace: {
        type: DataTypes.BOOLEAN,
        field: 'visible_en_marketplace',
        allowNull: false,
        defaultValue: true,
        comment: 'Si la categoría se muestra en el marketplace público'
    },
    totalProductos: {
        type: DataTypes.INTEGER,
        field: 'total_productos',
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de productos asociados (se actualiza por trigger o servicio)'
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
    tableName: 'categorias',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['id_empresa', 'slug'],
            name: 'idx_unique_slug_por_empresa'
        },
        {
            fields: ['id_empresa', 'activo', 'visible_en_marketplace']
        }
    ]
});

/**
 * Verifica si la categoría está disponible para mostrar
 */
Categoria.prototype.estaDisponible = function() {
    return this.activo === true && this.eliminado === false;
};

/**
 * Verifica si la categoría se debe mostrar en el marketplace público
 */
Categoria.prototype.esVisiblePublicamente = function() {
    return this.estaDisponible() && this.visibleEnMarketplace === true;
};

/**
 * Devuelve los datos de la categoría para clientes del marketplace
 * Excluye campos administrativos
 */
Categoria.prototype.datosPublicos = function() {
    return {
        idCategoria: this.idCategoria,
        nombre: this.nombre,
        slug: this.slug,
        descripcion: this.descripcion,
        icono: this.icono,
        color: this.color,
        imagenUrl: this.imagenUrl,
        idCategoriaPadre: this.idCategoriaPadre,
        ordenVisualizacion: this.ordenVisualizacion,
        totalProductos: this.totalProductos
    };
};

/**
 * Genera un slug URL-friendly a partir del nombre
 * Ejemplo: "Bebidas Frías" → "bebidas-frias"
 * 
 * @param {string} texto - Texto del cual generar el slug
 * @returns {string} Slug generado
 */
Categoria.generarSlug = function(texto) {
    if (!texto) return '';

    return texto
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .substring(0, 120);
};

module.exports = Categoria;