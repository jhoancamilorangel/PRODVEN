const { InvProveedor, InvArticulo } = require('../../models/inventario');
const logger = require('../../config/logger');

/**
 * Servicio de Proveedores del Inventario Interno.
 */

const listarProveedores = async (idEmpresa) => {
    const proveedores = await InvProveedor.findAll({
        where: { idEmpresa, eliminado: false },
        order: [['nombre', 'ASC']]
    });

    const resultado = [];
    for (const prov of proveedores) {
        const totalArticulos = await InvArticulo.count({
            where: { idProveedor: prov.idProveedor, eliminado: false }
        });
        resultado.push({ ...prov.toJSON(), totalArticulos });
    }
    return resultado;
};

const obtenerProveedor = async (idEmpresa, idProveedor) => {
    return await InvProveedor.findOne({
        where: { idProveedor, idEmpresa, eliminado: false }
    });
};

const crearProveedor = async (idEmpresa, datos) => {
    const proveedor = await InvProveedor.create({
        idEmpresa,
        nombre: datos.nombre.trim(),
        nit: datos.nit?.trim() || null,
        telefono: datos.telefono?.trim() || null,
        correo: datos.correo?.trim() || null,
        direccion: datos.direccion?.trim() || null,
        contacto: datos.contacto?.trim() || null,
        notas: datos.notas?.trim() || null
    });
    logger.info(`Proveedor inv interno creado: ${proveedor.idProveedor}`);
    return proveedor;
};

const actualizarProveedor = async (idEmpresa, idProveedor, datos) => {
    const proveedor = await InvProveedor.findOne({
        where: { idProveedor, idEmpresa, eliminado: false }
    });
    if (!proveedor) return null;

    const campos = ['nombre', 'nit', 'telefono', 'correo', 'direccion', 'contacto', 'notas'];
    for (const campo of campos) {
        if (datos[campo] !== undefined) {
            proveedor[campo] = datos[campo]?.trim() || (campo === 'nombre' ? proveedor[campo] : null);
        }
    }
    if (datos.activo !== undefined) proveedor.activo = datos.activo;

    await proveedor.save();
    return proveedor;
};

const eliminarProveedor = async (idEmpresa, idProveedor) => {
    const proveedor = await InvProveedor.findOne({
        where: { idProveedor, idEmpresa, eliminado: false }
    });
    if (!proveedor) return { eliminado: false, motivo: 'no_encontrado' };

    await InvArticulo.update(
        { idProveedor: null },
        { where: { idProveedor, eliminado: false } }
    );

    proveedor.eliminado = true;
    proveedor.activo = false;
    await proveedor.save();
    logger.info(`Proveedor inv interno eliminado: ${idProveedor}`);
    return { eliminado: true };
};

module.exports = {
    listarProveedores,
    obtenerProveedor,
    crearProveedor,
    actualizarProveedor,
    eliminarProveedor
};