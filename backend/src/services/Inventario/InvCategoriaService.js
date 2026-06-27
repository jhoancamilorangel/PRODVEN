const { InvCategoria, InvArticulo } = require('../../models/inventario');
const logger = require('../../config/logger');

/**
 * Servicio de Categorías del Inventario Interno.
 */

const listarCategorias = async (idEmpresa) => {
    const categorias = await InvCategoria.findAll({
        where: { idEmpresa, eliminado: false },
        order: [['nombre', 'ASC']]
    });

    // Contar artículos por categoría
    const resultado = [];
    for (const cat of categorias) {
        const totalArticulos = await InvArticulo.count({
            where: { idCategoria: cat.idCategoria, eliminado: false }
        });
        resultado.push({ ...cat.toJSON(), totalArticulos });
    }
    return resultado;
};

const obtenerCategoria = async (idEmpresa, idCategoria) => {
    return await InvCategoria.findOne({
        where: { idCategoria, idEmpresa, eliminado: false }
    });
};

const crearCategoria = async (idEmpresa, datos) => {
    const categoria = await InvCategoria.create({
        idEmpresa,
        nombre: datos.nombre.trim(),
        descripcion: datos.descripcion?.trim() || null,
        color: datos.color?.trim() || null
    });
    logger.info(`Categoría inv interna creada: ${categoria.idCategoria}`);
    return categoria;
};

const actualizarCategoria = async (idEmpresa, idCategoria, datos) => {
    const categoria = await InvCategoria.findOne({
        where: { idCategoria, idEmpresa, eliminado: false }
    });
    if (!categoria) return null;

    if (datos.nombre !== undefined) categoria.nombre = datos.nombre.trim();
    if (datos.descripcion !== undefined) categoria.descripcion = datos.descripcion?.trim() || null;
    if (datos.color !== undefined) categoria.color = datos.color?.trim() || null;
    if (datos.activo !== undefined) categoria.activo = datos.activo;

    await categoria.save();
    return categoria;
};

const eliminarCategoria = async (idEmpresa, idCategoria) => {
    const categoria = await InvCategoria.findOne({
        where: { idCategoria, idEmpresa, eliminado: false }
    });
    if (!categoria) return { eliminado: false, motivo: 'no_encontrada' };

    // Si tiene artículos asociados, los desvinculamos (no se borran)
    await InvArticulo.update(
        { idCategoria: null },
        { where: { idCategoria, eliminado: false } }
    );

    categoria.eliminado = true;
    categoria.activo = false;
    await categoria.save();
    logger.info(`Categoría inv interna eliminada: ${idCategoria}`);
    return { eliminado: true };
};

module.exports = {
    listarCategorias,
    obtenerCategoria,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria
};