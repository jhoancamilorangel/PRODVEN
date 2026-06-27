const { InvBodega, InvStock } = require('../../models/inventario');
const logger = require('../../config/logger');

/**
 * Servicio de Bodegas del Inventario Interno.
 */

const listarBodegas = async (idEmpresa) => {
    const bodegas = await InvBodega.findAll({
        where: { idEmpresa, eliminado: false },
        order: [['es_principal', 'DESC'], ['nombre', 'ASC']]
    });

    const resultado = [];
    for (const bod of bodegas) {
        const stocks = await InvStock.findAll({ where: { idBodega: bod.idBodega, idEmpresa } });
        const articulosConStock = stocks.filter(s => parseFloat(s.cantidadFisica) > 0).length;
        const valorTotal = stocks.reduce((sum, s) => sum + parseFloat(s.valorTotal || 0), 0);
        resultado.push({
            ...bod.toJSON(),
            articulosConStock,
            valorTotal: Math.round(valorTotal * 100) / 100
        });
    }
    return resultado;
};

const obtenerBodega = async (idEmpresa, idBodega) => {
    return await InvBodega.findOne({
        where: { idBodega, idEmpresa, eliminado: false }
    });
};

const crearBodega = async (idEmpresa, datos) => {
    const bodega = await InvBodega.create({
        idEmpresa,
        nombre: datos.nombre.trim(),
        codigo: datos.codigo?.trim() || null,
        descripcion: datos.descripcion?.trim() || null,
        direccion: datos.direccion?.trim() || null,
        esPrincipal: false
    });
    logger.info(`Bodega inv interna creada: ${bodega.idBodega}`);
    return bodega;
};

const actualizarBodega = async (idEmpresa, idBodega, datos) => {
    const bodega = await InvBodega.findOne({
        where: { idBodega, idEmpresa, eliminado: false }
    });
    if (!bodega) return null;

    if (datos.nombre !== undefined) bodega.nombre = datos.nombre.trim();
    if (datos.codigo !== undefined) bodega.codigo = datos.codigo?.trim() || null;
    if (datos.descripcion !== undefined) bodega.descripcion = datos.descripcion?.trim() || null;
    if (datos.direccion !== undefined) bodega.direccion = datos.direccion?.trim() || null;
    if (datos.activo !== undefined) bodega.activo = datos.activo;

    await bodega.save();
    return bodega;
};

const eliminarBodega = async (idEmpresa, idBodega) => {
    const bodega = await InvBodega.findOne({
        where: { idBodega, idEmpresa, eliminado: false }
    });
    if (!bodega) return { eliminado: false, motivo: 'no_encontrada' };
    if (bodega.esPrincipal) return { eliminado: false, motivo: 'principal' };

    const stocks = await InvStock.findAll({ where: { idBodega, idEmpresa } });
    const tieneStock = stocks.some(s => parseFloat(s.cantidadFisica) > 0);
    if (tieneStock) return { eliminado: false, motivo: 'con_stock' };

    bodega.eliminado = true;
    bodega.activo = false;
    await bodega.save();
    logger.info(`Bodega inv interna eliminada: ${idBodega}`);
    return { eliminado: true };
};

module.exports = {
    listarBodegas,
    obtenerBodega,
    crearBodega,
    actualizarBodega,
    eliminarBodega
};