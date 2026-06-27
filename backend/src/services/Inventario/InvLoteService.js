const { InvLote, InvArticulo, InvBodega } = require('../../models/inventario');
const inventarioService = require('./invInventarioService');
const logger = require('../../config/logger');

/**
 * Servicio de Lotes y Vencimientos del Inventario Interno.
 *
 * Un lote representa una tanda de un artículo con su fecha de vencimiento.
 * Al crear un lote con cantidad, se registra una entrada de stock a la bodega,
 * para que el inventario y los lotes queden siempre cuadrados.
 */

const DIAS_POR_VENCER = 30; // umbral para alertar "por vencer"

/**
 * Calcula el estado de vencimiento de un lote.
 */
const calcularEstadoVencimiento = (fechaVencimiento) => {
    if (!fechaVencimiento) return { estado: 'sin_fecha', diasParaVencer: null };

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const venc = new Date(fechaVencimiento);
    venc.setHours(0, 0, 0, 0);

    const msPorDia = 1000 * 60 * 60 * 24;
    const diasParaVencer = Math.round((venc - hoy) / msPorDia);

    let estado;
    if (diasParaVencer < 0) estado = 'vencido';
    else if (diasParaVencer <= DIAS_POR_VENCER) estado = 'por_vencer';
    else estado = 'vigente';

    return { estado, diasParaVencer };
};

/**
 * Lista los lotes de un artículo, con su estado de vencimiento y nombre de bodega.
 */
const listarLotesPorArticulo = async (idEmpresa, idArticulo) => {
    const lotes = await InvLote.findAll({
        where: { idEmpresa, idArticulo, eliminado: false },
        order: [['fecha_vencimiento', 'ASC']]
    });

    const bodegas = await InvBodega.findAll({ where: { idEmpresa, eliminado: false } });
    const mapaBodega = {};
    bodegas.forEach(b => { mapaBodega[b.idBodega] = b.nombre; });

    return lotes.map(lote => {
        const { estado, diasParaVencer } = calcularEstadoVencimiento(lote.fechaVencimiento);
        return {
            idLote: lote.idLote,
            idArticulo: lote.idArticulo,
            idBodega: lote.idBodega,
            nombreBodega: mapaBodega[lote.idBodega] || 'Bodega',
            numeroLote: lote.numeroLote,
            fechaFabricacion: lote.fechaFabricacion,
            fechaVencimiento: lote.fechaVencimiento,
            cantidadInicial: parseFloat(lote.cantidadInicial),
            cantidadActual: parseFloat(lote.cantidadActual),
            estadoVencimiento: estado,
            diasParaVencer
        };
    });
};

/**
 * Crea un lote y registra la entrada de stock correspondiente a la bodega.
 */
const crearLote = async (idEmpresa, datos, idUsuario) => {
    const {
        idArticulo,
        idBodega,
        numeroLote,
        fechaFabricacion = null,
        fechaVencimiento = null,
        cantidad = 0,
        costoUnitario = 0
    } = datos;

    if (!idArticulo || !idBodega || !numeroLote) {
        throw new Error('Faltan datos obligatorios del lote (artículo, bodega o número de lote)');
    }

    const cantidadNum = parseFloat(cantidad) || 0;

    // Crear el lote
    const lote = await InvLote.create({
        idEmpresa,
        idArticulo,
        idBodega,
        numeroLote: numeroLote.trim(),
        fechaFabricacion: fechaFabricacion || null,
        fechaVencimiento: fechaVencimiento || null,
        cantidadInicial: cantidadNum,
        cantidadActual: cantidadNum
    });

    // Si trae cantidad, registrar la entrada de stock ligada al lote
    if (cantidadNum > 0) {
        const resultado = await inventarioService.registrarMovimiento({
            idEmpresa,
            idArticulo,
            idBodega,
            tipo: 'entrada',
            cantidad: cantidadNum,
            costoUnitario: parseFloat(costoUnitario) || 0,
            idUsuario,
            motivo: `Entrada por lote ${numeroLote.trim()}`,
            idLote: lote.idLote
        });
        // El movimiento ya actualizó el stock; nada más que hacer aquí.
        void resultado;
    }

    // Marcar el artículo como que controla lotes (por si no lo estaba)
    await InvArticulo.update(
        { controlaLotes: true },
        { where: { idArticulo, idEmpresa } }
    );

    logger.info(`Lote inv interno creado: ${lote.idLote} (artículo ${idArticulo})`);
    return lote;
};

/**
 * Actualiza los datos de un lote (número, fechas). No cambia el stock.
 */
const actualizarLote = async (idEmpresa, idLote, datos) => {
    const lote = await InvLote.findOne({
        where: { idLote, idEmpresa, eliminado: false }
    });
    if (!lote) return null;

    if (datos.numeroLote !== undefined) lote.numeroLote = datos.numeroLote.trim();
    if (datos.fechaFabricacion !== undefined) lote.fechaFabricacion = datos.fechaFabricacion || null;
    if (datos.fechaVencimiento !== undefined) lote.fechaVencimiento = datos.fechaVencimiento || null;

    await lote.save();
    return lote;
};

/**
 * Elimina lógicamente un lote (no toca el stock ya registrado).
 */
const eliminarLote = async (idEmpresa, idLote) => {
    const lote = await InvLote.findOne({
        where: { idLote, idEmpresa, eliminado: false }
    });
    if (!lote) return false;

    lote.eliminado = true;
    lote.activo = false;
    await lote.save();
    logger.info(`Lote inv interno eliminado: ${idLote}`);
    return true;
};

module.exports = {
    calcularEstadoVencimiento,
    listarLotesPorArticulo,
    crearLote,
    actualizarLote,
    eliminarLote
};