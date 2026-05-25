const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Producto = sequelize.define('Producto', {
    idProducto: {
        type: DataTypes.CHAR(36),
        field: 'id_producto',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        comment: 'Empresa propietaria del producto (multi-tenancy)'
    },
    idCategoria: {
        type: DataTypes.CHAR(36),
        field: 'id_categoria',
        allowNull: true,
        comment: 'Categoría a la que pertenece el producto'
    },
    idProveedor: {
        type: DataTypes.CHAR(36),
        field: 'id_proveedor',
        allowNull: true,
        comment: 'Proveedor del producto o materia prima'
    },
    // ==========================================
    // IDENTIFICACIÓN DEL PRODUCTO
    // ==========================================
    nombre: {
        type: DataTypes.STRING(200),
        field: 'nombre',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre del producto no puede estar vacío' },
            len: { args: [2, 200], msg: 'El nombre debe tener entre 2 y 200 caracteres' }
        }
    },
    slug: {
        type: DataTypes.STRING(220),
        field: 'slug',
        allowNull: true,
        comment: 'Versión URL-friendly del nombre'
    },
    codigoSku: {
        type: DataTypes.STRING(50),
        field: 'codigo_sku',
        allowNull: false,
        comment: 'Código único del producto dentro de la empresa'
    },
    codigoBarras: {
        type: DataTypes.STRING(50),
        field: 'codigo_barras',
        allowNull: true,
        comment: 'Código de barras EAN/UPC para escaneo'
    },
    descripcionCorta: {
        type: DataTypes.STRING(255),
        field: 'descripcion_corta',
        allowNull: true,
        comment: 'Resumen breve para tarjetas del catálogo'
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true,
        comment: 'Descripción completa del producto'
    },
    // ==========================================
    // PRECIOS
    // ==========================================
    precioVenta: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'precio_venta',
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'El precio de venta no puede ser negativo' }
        }
    },
    precioCosto: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'precio_costo',
        allowNull: false,
        defaultValue: 0.00,
        validate: {
            min: { args: [0], msg: 'El precio de costo no puede ser negativo' }
        },
        comment: 'Precio de compra. Solo visible para Admin y Supervisor'
    },
    precioOferta: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'precio_oferta',
        allowNull: true,
        comment: 'Precio especial cuando el producto está en oferta'
    },
    aplicaIva: {
        type: DataTypes.BOOLEAN,
        field: 'aplica_iva',
        allowNull: false,
        defaultValue: true,
        comment: 'Si el producto está gravado con IVA'
    },
    // ==========================================
    // INVENTARIO (gestión básica, avanzada en Fase 7)
    // ==========================================
    cantidadStock: {
        type: DataTypes.INTEGER,
        field: 'cantidad_stock',
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: { args: [0], msg: 'El stock no puede ser negativo' }
        }
    },
    stockMinimo: {
        type: DataTypes.INTEGER,
        field: 'stock_minimo',
        allowNull: false,
        defaultValue: 5,
        comment: 'Umbral para alertas de stock bajo'
    },
    stockMaximo: {
        type: DataTypes.INTEGER,
        field: 'stock_maximo',
        allowNull: true,
        comment: 'Capacidad máxima de almacenamiento'
    },
    unidadMedida: {
        type: DataTypes.ENUM('unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'),
        field: 'unidad_medida',
        allowNull: false,
        defaultValue: 'unidad'
    },
    gestionaStock: {
        type: DataTypes.BOOLEAN,
        field: 'gestiona_stock',
        allowNull: false,
        defaultValue: true,
        comment: 'Si false, el producto se vende sin control de inventario (ej: servicios)'
    },
    permiteVentaSinStock: {
        type: DataTypes.BOOLEAN,
        field: 'permite_venta_sin_stock',
        allowNull: false,
        defaultValue: false,
        comment: 'Si permite vender aunque no haya stock (pedidos sobre encargo)'
    },
    // ==========================================
    // CARACTERÍSTICAS FÍSICAS (para domicilios)
    // ==========================================
    peso: {
        type: DataTypes.DECIMAL(10, 3),
        field: 'peso',
        allowNull: true,
        comment: 'Peso en kilogramos, para cálculo de envío'
    },
    largo: {
        type: DataTypes.DECIMAL(10, 2),
        field: 'largo',
        allowNull: true,
        comment: 'Largo en cm'
    },
    ancho: {
        type: DataTypes.DECIMAL(10, 2),
        field: 'ancho',
        allowNull: true,
        comment: 'Ancho en cm'
    },
    alto: {
        type: DataTypes.DECIMAL(10, 2),
        field: 'alto',
        allowNull: true,
        comment: 'Alto en cm'
    },
    // ==========================================
    // PRODUCCIÓN (para productos fabricados)
    // ==========================================
    esFabricado: {
        type: DataTypes.BOOLEAN,
        field: 'es_fabricado',
        allowNull: false,
        defaultValue: false,
        comment: 'Si el producto se fabrica internamente (tiene BOM)'
    },
    tiempoPreparacionMin: {
        type: DataTypes.INTEGER,
        field: 'tiempo_preparacion_min',
        allowNull: true,
        comment: 'Minutos que tarda en prepararse/fabricarse'
    },
    // ==========================================
    // ESTADO Y VISIBILIDAD
    // ==========================================
    publicado: {
        type: DataTypes.BOOLEAN,
        field: 'publicado',
        allowNull: false,
        defaultValue: false,
        comment: 'Si aparece en el marketplace público'
    },
    destacado: {
        type: DataTypes.BOOLEAN,
        field: 'destacado',
        allowNull: false,
        defaultValue: false,
        comment: 'Si se muestra en sección de destacados'
    },
    enOferta: {
        type: DataTypes.BOOLEAN,
        field: 'en_oferta',
        allowNull: false,
        defaultValue: false,
        comment: 'Si el producto está en oferta'
    },
    disponible: {
        type: DataTypes.BOOLEAN,
        field: 'disponible',
        allowNull: false,
        defaultValue: true,
        comment: 'Si está disponible para la venta'
    },
    // ==========================================
    // CALIFICACIÓN (actualizado por reseñas)
    // ==========================================
    calificacionPromedio: {
        type: DataTypes.DECIMAL(3, 2),
        field: 'calificacion_promedio',
        allowNull: false,
        defaultValue: 0.00
    },
    totalResenas: {
        type: DataTypes.INTEGER,
        field: 'total_resenas',
        allowNull: false,
        defaultValue: 0
    },
    totalVendidos: {
        type: DataTypes.INTEGER,
        field: 'total_vendidos',
        allowNull: false,
        defaultValue: 0,
        comment: 'Contador de unidades vendidas, para ordenar por popularidad'
    },
    // ==========================================
    // ESTADO TÉCNICO
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
    tableName: 'productos',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true,
    indexes: [
        {
            unique: true,
            fields: ['id_empresa', 'codigo_sku'],
            name: 'idx_unique_sku_por_empresa'
        },
        {
            fields: ['id_empresa', 'activo', 'publicado']
        },
        {
            fields: ['id_empresa', 'id_categoria']
        },
        {
            fields: ['id_empresa', 'disponible', 'cantidad_stock']
        }
    ]
});

/**
 * Verifica si el producto está disponible para la venta
 */
Producto.prototype.estaDisponibleParaVenta = function() {
    if (!this.activo || this.eliminado || !this.disponible) {
        return false;
    }
    if (this.gestionaStock && !this.permiteVentaSinStock && this.cantidadStock <= 0) {
        return false;
    }
    return true;
};

/**
 * Verifica si el producto está visible en el marketplace público
 */
Producto.prototype.esVisiblePublicamente = function() {
    return this.activo && !this.eliminado && this.publicado && this.disponible;
};

/**
 * Verifica si el stock está bajo el umbral mínimo
 */
Producto.prototype.tieneStockBajo = function() {
    if (!this.gestionaStock) return false;
    return this.cantidadStock <= this.stockMinimo;
};

/**
 * Calcula el margen de ganancia en porcentaje
 * Solo para uso interno (Admin/Supervisor)
 */
Producto.prototype.calcularMargen = function() {
    const costo = parseFloat(this.precioCosto);
    const venta = parseFloat(this.precioVenta);

    if (costo <= 0) return 0;

    const margen = ((venta - costo) / costo) * 100;
    return Math.round(margen * 100) / 100;
};

/**
 * Calcula la ganancia unitaria en valor absoluto
 */
Producto.prototype.calcularGananciaUnitaria = function() {
    const costo = parseFloat(this.precioCosto);
    const venta = parseFloat(this.precioVenta);
    return Math.round((venta - costo) * 100) / 100;
};

/**
 * Devuelve el precio efectivo de venta (considerando oferta)
 */
Producto.prototype.precioEfectivo = function() {
    if (this.enOferta && this.precioOferta && parseFloat(this.precioOferta) > 0) {
        return parseFloat(this.precioOferta);
    }
    return parseFloat(this.precioVenta);
};

/**
 * Devuelve los datos públicos del producto para el marketplace
 * IMPORTANTE: Excluye precioCosto, margen y datos administrativos
 */
Producto.prototype.datosPublicos = function() {
    return {
        idProducto: this.idProducto,
        idCategoria: this.idCategoria,
        nombre: this.nombre,
        slug: this.slug,
        descripcionCorta: this.descripcionCorta,
        descripcion: this.descripcion,
        precioVenta: parseFloat(this.precioVenta),
        precioEfectivo: this.precioEfectivo(),
        enOferta: this.enOferta,
        precioOferta: this.enOferta ? parseFloat(this.precioOferta || 0) : null,
        aplicaIva: this.aplicaIva,
        unidadMedida: this.unidadMedida,
        destacado: this.destacado,
        disponible: this.estaDisponibleParaVenta(),
        calificacionPromedio: parseFloat(this.calificacionPromedio),
        totalResenas: this.totalResenas,
        totalVendidos: this.totalVendidos,
        peso: this.peso ? parseFloat(this.peso) : null
    };
};

/**
 * Genera un slug URL-friendly a partir del nombre
 */
Producto.generarSlug = function(texto) {
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
        .substring(0, 220);
};

/**
 * Genera un código SKU automático basado en un prefijo y timestamp
 */
Producto.generarSku = function(prefijo = 'PROD') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const aleatorio = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefijo}-${timestamp}-${aleatorio}`;
};

module.exports = Producto;