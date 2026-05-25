const Categoria = require('../../models/Categoria');
const Producto = require('../../models/Producto');
const logger = require('../../config/logger');

/**
 * Servicio de Categorías
 * Centraliza la lógica de negocio de categorías
 */

/**
 * Genera un slug único dentro de la empresa
 * Si el slug ya existe, le agrega un sufijo numérico
 *
 * @param {string} nombre - Nombre de la categoría
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} idExcluir - ID a excluir (para edición)
 * @returns {Promise<string>} Slug único
 */
const generarSlugUnico = async (nombre, idEmpresa, idExcluir = null) => {
    const { Op } = require('sequelize');
    let slugBase = Categoria.generarSlug(nombre);
    let slug = slugBase;
    let contador = 1;

    while (true) {
        const where = { idEmpresa, slug };
        if (idExcluir) {
            where.idCategoria = { [Op.ne]: idExcluir };
        }

        const existe = await Categoria.findOne({ where });
        if (!existe) break;

        slug = `${slugBase}-${contador}`;
        contador += 1;
    }

    return slug;
};

/**
 * Crea una categoría con slug único generado automáticamente
 *
 * @param {object} datos - Datos de la categoría
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Categoria>} Categoría creada
 */
const crearCategoria = async (datos, idEmpresa) => {
    const slug = await generarSlugUnico(datos.nombre, idEmpresa);

    const categoria = await Categoria.create({
        ...datos,
        idEmpresa,
        slug
    });

    logger.info(`Categoría creada: ${categoria.idCategoria} para empresa ${idEmpresa}`);
    return categoria;
};

/**
 * Actualiza el contador de productos de una categoría
 *
 * @param {string} idCategoria - ID de la categoría
 * @returns {Promise<void>}
 */
const actualizarContadorProductos = async (idCategoria) => {
    if (!idCategoria) return;

    const total = await Producto.count({
        where: {
            idCategoria,
            activo: true,
            eliminado: false
        }
    });

    await Categoria.update(
        { totalProductos: total },
        { where: { idCategoria } }
    );
};

/**
 * Verifica si una categoría tiene productos asociados
 *
 * @param {string} idCategoria - ID de la categoría
 * @returns {Promise<number>} Cantidad de productos asociados
 */
const contarProductosAsociados = async (idCategoria) => {
    return await Producto.count({
        where: {
            idCategoria,
            eliminado: false
        }
    });
};

module.exports = {
    generarSlugUnico,
    crearCategoria,
    actualizarContadorProductos,
    contarProductosAsociados
};