const Proveedor = require('../../models/Proveedor');
const Producto = require('../../models/Producto');
const logger = require('../../config/logger');

/**
 * Servicio de Proveedores
 * Centraliza la lógica de negocio de proveedores
 */

/**
 * Crea un proveedor para una empresa
 *
 * @param {object} datos - Datos del proveedor
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Proveedor>} Proveedor creado
 */
const crearProveedor = async (datos, idEmpresa) => {
    const proveedor = await Proveedor.create({
        ...datos,
        idEmpresa
    });

    logger.info(`Proveedor creado: ${proveedor.idProveedor} para empresa ${idEmpresa}`);
    return proveedor;
};

/**
 * Verifica si un proveedor tiene productos asociados
 * Útil antes de eliminar para advertir al usuario
 *
 * @param {string} idProveedor - ID del proveedor
 * @returns {Promise<number>} Cantidad de productos asociados
 */
const contarProductosAsociados = async (idProveedor) => {
    return await Producto.count({
        where: {
            idProveedor,
            eliminado: false
        }
    });
};

/**
 * Desvincula un proveedor de todos sus productos
 * Se usa antes de eliminar un proveedor: los productos quedan sin proveedor
 * pero no se eliminan
 *
 * @param {string} idProveedor - ID del proveedor
 * @returns {Promise<number>} Cantidad de productos desvinculados
 */
const desvincularDeProductos = async (idProveedor) => {
    const [cantidad] = await Producto.update(
        { idProveedor: null },
        { where: { idProveedor } }
    );

    logger.info(`Proveedor ${idProveedor} desvinculado de ${cantidad} producto(s)`);
    return cantidad;
};

module.exports = {
    crearProveedor,
    contarProductosAsociados,
    desvincularDeProductos
};