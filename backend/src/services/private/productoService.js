const Producto = require('../../models/Producto');
const ImagenProducto = require('../../models/ImagenProducto');
const Categoria = require('../../models/Categoria');
const empresaService = require('../shared/empresaService');
const categoriaService = require('../shared/categoriaService');
const cloudinaryService = require('./cloudinaryService');
const inventarioService = require('./inventarioService');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Productos
 * Centraliza la lógica de negocio del catálogo de productos
 */

/**
 * Genera un SKU único dentro de la empresa
 */
const generarSkuUnico = async (idEmpresa, skuPropuesto = null) => {
    if (skuPropuesto) {
        const existe = await Producto.findOne({
            where: { idEmpresa, codigoSku: skuPropuesto }
        });

        if (!existe) {
            return skuPropuesto;
        }

        throw new Error(`El código SKU "${skuPropuesto}" ya existe en tu empresa`);
    }

    let sku;
    let existe = true;

    while (existe) {
        sku = Producto.generarSku('PROD');
        existe = await Producto.findOne({
            where: { idEmpresa, codigoSku: sku }
        });
    }

    return sku;
};

/**
 * Crea un producto validando el límite del plan.
 * Si se indica un stock inicial mayor a cero y el producto gestiona stock,
 * registra automáticamente una entrada de inventario (entrada_inicial) a la
 * bodega principal, para que ese stock sea real y vendible desde el carrito.
 *
 * El registro de stock va protegido: si el inventario fallara (por ejemplo,
 * si la empresa no tuviera bodega principal), el producto igual se crea y
 * solo se registra el inconveniente en el log. La creación nunca se rompe.
 *
 * @param {object} datos - Datos del producto
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} idUsuario - Usuario que crea (para trazabilidad del movimiento)
 * @returns {Promise<object>} { exito, producto, mensaje }
 */
const crearProducto = async (datos, idEmpresa, idUsuario = null) => {
    const cantidadActual = await Producto.count({
        where: { idEmpresa, eliminado: false }
    });

    const limite = await empresaService.puedeCrearMasProductos(idEmpresa, cantidadActual);

    if (!limite.puede) {
        return {
            exito: false,
            producto: null,
            mensaje: limite.mensaje
        };
    }

    const sku = await generarSkuUnico(idEmpresa, datos.codigoSku);
    const slug = Producto.generarSlug(datos.nombre);

    // El stock real se maneja por inventario. Creamos el producto en 0 y,
    // si hay stock inicial, lo cargamos con un movimiento de inventario.
    const stockInicial = parseInt(datos.cantidadStock, 10) || 0;

    const producto = await Producto.create({
        ...datos,
        idEmpresa,
        codigoSku: sku,
        slug,
        cantidadStock: 0
    });

    if (datos.idCategoria) {
        await categoriaService.actualizarContadorProductos(datos.idCategoria);
    }

    logger.info(`Producto creado: ${producto.idProducto} (SKU: ${sku}) para empresa ${idEmpresa}`);

    // Registro del stock inicial como entrada de inventario (protegido)
    if (stockInicial > 0 && producto.gestionaStock) {
        try {
            await inventarioService.registrarMovimiento({
                idEmpresa,
                idProducto: producto.idProducto,
                tipo: 'entrada_inicial',
                cantidad: stockInicial,
                costoUnitario: parseFloat(datos.precioCosto) || 0,
                idUsuario,
                motivo: 'Inventario inicial al crear el producto',
                referencia: { tipo: 'producto', id: producto.idProducto }
            });

            // Recargamos el producto para devolver el cantidadStock ya sincronizado
            await producto.reload();

            logger.info(`Stock inicial de ${stockInicial} registrado para producto ${producto.idProducto}`);
        } catch (error) {
            logger.error(`No se pudo registrar el stock inicial del producto ${producto.idProducto}: ${error.message}`);
            // El producto ya está creado; el stock se podrá cargar luego desde Inventario.
        }
    }

    return {
        exito: true,
        producto,
        mensaje: 'Producto creado correctamente'
    };
};

/**
 * Elimina un producto y todas sus imágenes de Cloudinary
 */
const eliminarProductoCompleto = async (idProducto, idEmpresa) => {
    const transaction = await sequelize.transaction();

    try {
        const producto = await Producto.findOne({
            where: { idProducto, idEmpresa, eliminado: false },
            transaction
        });

        if (!producto) {
            await transaction.rollback();
            return false;
        }

        const imagenes = await ImagenProducto.findAll({
            where: { idProducto, eliminado: false },
            transaction
        });

        const publicIds = imagenes.map(img => img.publicId).filter(Boolean);

        await ImagenProducto.update(
            { eliminado: true, activo: false },
            { where: { idProducto }, transaction }
        );

        producto.eliminado = true;
        producto.activo = false;
        producto.publicado = false;
        producto.disponible = false;
        await producto.save({ transaction });

        const idCategoria = producto.idCategoria;

        await transaction.commit();

        if (publicIds.length > 0) {
            await cloudinaryService.eliminarMultiplesImagenes(publicIds);
        }

        if (idCategoria) {
            await categoriaService.actualizarContadorProductos(idCategoria);
        }

        logger.info(`Producto eliminado completo: ${idProducto} con ${publicIds.length} imagen(es)`);
        return true;
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al eliminar producto completo: ${error.message}`);
        throw error;
    }
};

/**
 * Cambia el estado de publicación de un producto en el marketplace
 */
const togglePublicacion = async (idProducto, idEmpresa, publicar) => {
    const producto = await Producto.findOne({
        where: { idProducto, idEmpresa, eliminado: false }
    });

    if (!producto) {
        return { exito: false, producto: null, mensaje: 'Producto no encontrado' };
    }

    if (publicar) {
        const tieneAcceso = await empresaService.tieneAcceso(idEmpresa, 'permiteMarketplace');

        if (!tieneAcceso) {
            return {
                exito: false,
                producto,
                mensaje: 'Tu plan no incluye acceso al marketplace. Considera actualizar tu suscripción.'
            };
        }

        const tieneImagenes = await ImagenProducto.count({
            where: { idProducto, eliminado: false }
        });

        if (tieneImagenes === 0) {
            return {
                exito: false,
                producto,
                mensaje: 'El producto necesita al menos una imagen para publicarse en el marketplace.'
            };
        }
    }

    producto.publicado = publicar;
    await producto.save();

    logger.info(`Producto ${idProducto} ${publicar ? 'publicado' : 'despublicado'}`);

    return {
        exito: true,
        producto,
        mensaje: publicar
            ? 'Producto publicado en el marketplace'
            : 'Producto retirado del marketplace'
    };
};

/**
 * Ajuste directo del campo cantidadStock.
 * NOTA: el stock real se gestiona por movimientos de inventario
 * (ver inventarioService). Este método queda para compatibilidad,
 * pero el flujo recomendado es registrar movimientos de inventario.
 */
const ajustarStock = async (idProducto, nuevoStock, idEmpresa) => {
    const producto = await Producto.findOne({
        where: { idProducto, idEmpresa, eliminado: false }
    });

    if (!producto) {
        throw new Error('Producto no encontrado');
    }

    if (nuevoStock < 0) {
        throw new Error('El stock no puede ser negativo');
    }

    producto.cantidadStock = nuevoStock;
    await producto.save();

    logger.info(`Stock ajustado para producto ${idProducto}: ${nuevoStock} unidades`);
    return producto;
};

module.exports = {
    generarSkuUnico,
    crearProducto,
    eliminarProductoCompleto,
    togglePublicacion,
    ajustarStock
};