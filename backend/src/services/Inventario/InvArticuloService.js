const { Op } = require('sequelize');
const {
    InvArticulo,
    InvCategoria,
    InvProveedor,
    InvStock
} = require('../../models/inventario');
const inventarioService = require('./invInventarioService');
const logger = require('../../config/logger');

/**
 * Servicio de Artículos del Inventario Interno
 * Crear, listar, obtener y editar artículos.
 */

/**
 * Crea un artículo. Si trae stock inicial, registra el movimiento de entrada
 * en la bodega indicada (o la principal si no se especifica).
 */
const crearArticulo = async (datos, idEmpresa, idUsuario) => {
    const {
        stockInicial = 0,
        costoInicial = 0,
        idBodega = null,
        ...datosArticulo
    } = datos;

    // Generar código interno si no viene
    if (!datosArticulo.codigoInterno) {
        datosArticulo.codigoInterno = InvArticulo.generarCodigo();
    }

    const articulo = await InvArticulo.create({
        ...datosArticulo,
        idEmpresa
    });

    // Si hay stock inicial, registrar como movimiento de entrada en la bodega elegida
    if (parseFloat(stockInicial) > 0) {
        await inventarioService.registrarMovimiento({
            idEmpresa,
            idArticulo: articulo.idArticulo,
            idBodega: idBodega || undefined, // si no viene, el servicio usa la principal
            tipo: 'entrada',
            cantidad: parseFloat(stockInicial),
            costoUnitario: parseFloat(costoInicial) || 0,
            idUsuario,
            motivo: 'Stock inicial'
        });
    }

    logger.info(`Artículo de inventario creado: ${articulo.idArticulo}`);
    return articulo;
};

/**
 * Lista los artículos con su stock total y filtros
 */
const listarArticulos = async (idEmpresa, filtros = {}) => {
    const where = { idEmpresa, eliminado: false };

    if (filtros.idCategoria) where.idCategoria = filtros.idCategoria;
    if (filtros.activo !== undefined) where.activo = filtros.activo;

    if (filtros.busqueda) {
        where[Op.or] = [
            { nombre: { [Op.like]: `%${filtros.busqueda}%` } },
            { codigoInterno: { [Op.like]: `%${filtros.busqueda}%` } },
            { codigoBarras: { [Op.like]: `%${filtros.busqueda}%` } }
        ];
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = Math.min(parseInt(filtros.limit, 10) || 50, 200);
    const offset = (pagina - 1) * limit;

    const { count, rows } = await InvArticulo.findAndCountAll({
        where,
        limit,
        offset,
        order: [['nombre', 'ASC']],
        include: [
            { model: InvCategoria, as: 'categoria', attributes: ['idCategoria', 'nombre', 'color'], required: false },
            { model: InvStock, as: 'stocks', attributes: ['cantidadFisica', 'cantidadReservada', 'valorTotal'], required: false }
        ]
    });

    const articulos = rows.map(art => {
        const datos = art.toJSON();
        const stocks = datos.stocks || [];
        const fisicaTotal = stocks.reduce((s, st) => s + parseFloat(st.cantidadFisica || 0), 0);
        const reservadaTotal = stocks.reduce((s, st) => s + parseFloat(st.cantidadReservada || 0), 0);
        const valorTotal = stocks.reduce((s, st) => s + parseFloat(st.valorTotal || 0), 0);

        return {
            idArticulo: datos.idArticulo,
            nombre: datos.nombre,
            codigoInterno: datos.codigoInterno,
            codigoBarras: datos.codigoBarras,
            unidadMedida: datos.unidadMedida,
            stockMinimo: parseFloat(datos.stockMinimo),
            puntoReorden: datos.puntoReorden !== null ? parseFloat(datos.puntoReorden) : null,
            controlaLotes: datos.controlaLotes,
            costoPromedio: parseFloat(datos.costoPromedio),
            categoria: datos.categoria || null,
            cantidadFisica: Math.round(fisicaTotal * 1000) / 1000,
            cantidadReservada: Math.round(reservadaTotal * 1000) / 1000,
            cantidadDisponible: Math.round((fisicaTotal - reservadaTotal) * 1000) / 1000,
            valorTotal: Math.round(valorTotal * 100) / 100,
            activo: datos.activo
        };
    });

    return {
        articulos,
        paginacion: {
            pagina, limit, total: count, totalPaginas: Math.ceil(count / limit)
        }
    };
};

/**
 * Obtiene un artículo con su stock por bodega
 */
const obtenerArticulo = async (idEmpresa, idArticulo) => {
    const articulo = await InvArticulo.findOne({
        where: { idArticulo, idEmpresa, eliminado: false },
        include: [
            { model: InvCategoria, as: 'categoria', required: false },
            { model: InvProveedor, as: 'proveedor', required: false }
        ]
    });

    if (!articulo) return null;

    const stocks = await InvStock.findAll({ where: { idArticulo, idEmpresa } });

    return {
        articulo: articulo.toJSON(),
        stockPorBodega: stocks.map(s => s.resumen())
    };
};

/**
 * Actualiza un artículo
 */
const actualizarArticulo = async (idEmpresa, idArticulo, datos) => {
    const articulo = await InvArticulo.findOne({
        where: { idArticulo, idEmpresa, eliminado: false }
    });
    if (!articulo) return null;

    delete datos.idArticulo;
    delete datos.idEmpresa;
    delete datos.costoPromedio;

    await articulo.update(datos);
    return articulo;
};

/**
 * Elimina lógicamente un artículo
 */
const eliminarArticulo = async (idEmpresa, idArticulo) => {
    const articulo = await InvArticulo.findOne({
        where: { idArticulo, idEmpresa, eliminado: false }
    });
    if (!articulo) return false;

    await articulo.update({ eliminado: true, activo: false });
    return true;
};

module.exports = {
    crearArticulo,
    listarArticulos,
    obtenerArticulo,
    actualizarArticulo,
    eliminarArticulo
};