const {
    InvArticulo,
    InvStock,
    InvBodega,
    InvMovimiento
} = require('../../models/inventario');
const Usuario = require('../../models/Usuario');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio del Control de Inventario Interno
 *
 * Cerebro del módulo. Maneja:
 *  - Creación de movimientos con actualización atómica de saldos
 *  - Costo promedio ponderado en cada entrada
 *  - Bodega principal automática
 *  - Kardex, resumen y stock bajo
 *  - Transferencias entre bodegas
 *
 * Todo cambio de stock pasa por aquí. Nada toca el inventario por fuera.
 */

// =====================================================
// BODEGAS
// =====================================================

const crearBodegaPrincipal = async (idEmpresa, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    const existente = await InvBodega.findOne({
        where: { idEmpresa, esPrincipal: true, eliminado: false },
        ...opciones
    });
    if (existente) return existente;

    return await InvBodega.create({
        idEmpresa,
        nombre: 'Bodega Principal',
        codigo: 'PRIN',
        descripcion: 'Bodega principal del inventario interno',
        esPrincipal: true
    }, opciones);
};

const obtenerBodegaPrincipal = async (idEmpresa, transaction = null) => {
    const opciones = transaction ? { transaction } : {};
    let bodega = await InvBodega.findOne({
        where: { idEmpresa, esPrincipal: true, eliminado: false, activo: true },
        ...opciones
    });
    if (!bodega) {
        bodega = await crearBodegaPrincipal(idEmpresa, transaction);
    }
    return bodega;
};

// =====================================================
// STOCK
// =====================================================

const obtenerOCrearStock = async (idEmpresa, idArticulo, idBodega, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    let stock = await InvStock.findOne({
        where: { idArticulo, idBodega },
        ...opciones
    });

    if (!stock) {
        stock = await InvStock.create({
            idEmpresa,
            idArticulo,
            idBodega,
            cantidadFisica: 0,
            cantidadReservada: 0,
            costoPromedio: 0,
            valorTotal: 0
        }, opciones);
    }

    return stock;
};

// =====================================================
// COSTO PROMEDIO PONDERADO
// =====================================================

const calcularCostoPromedioPonderado = (cantidadActual, costoActual, cantidadNueva, costoNuevo) => {
    const stock = parseFloat(cantidadActual) || 0;
    const costo = parseFloat(costoActual) || 0;
    const entra = parseFloat(cantidadNueva) || 0;
    const costoEntra = parseFloat(costoNuevo) || 0;

    const totalDespues = stock + entra;
    if (totalDespues <= 0) return 0;

    const valorActual = stock * costo;
    const valorNuevo = entra * costoEntra;
    const promedio = (valorActual + valorNuevo) / totalDespues;

    return Math.round(promedio * 100) / 100;
};

// =====================================================
// REGISTRAR MOVIMIENTO (función central)
// =====================================================

const registrarMovimiento = async (datos) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            idEmpresa,
            idArticulo,
            tipo,
            cantidad,
            costoUnitario = 0,
            idUsuario = null,
            motivo = null,
            documentoSoporte = null,
            idProveedor = null,
            idLote = null,
            observaciones = null
        } = datos;

        let idBodega = datos.idBodega;

        if (!idEmpresa || !idArticulo || !tipo || !cantidad) {
            throw new Error('Faltan datos obligatorios para el movimiento');
        }
        if (parseFloat(cantidad) <= 0) {
            throw new Error('La cantidad debe ser mayor a cero');
        }

        if (!idBodega) {
            const principal = await obtenerBodegaPrincipal(idEmpresa, transaction);
            idBodega = principal.idBodega;
        }

        const esEntrada = InvMovimiento.esEntrada(tipo);
        const stock = await obtenerOCrearStock(idEmpresa, idArticulo, idBodega, transaction);

        const cantidadAnterior = parseFloat(stock.cantidadFisica);
        const cantidadMov = parseFloat(cantidad);

        if (!esEntrada && cantidadAnterior < cantidadMov) {
            throw new Error(`Stock insuficiente. Disponible: ${cantidadAnterior}, solicitado: ${cantidadMov}`);
        }

        const cantidadDespues = esEntrada
            ? cantidadAnterior + cantidadMov
            : cantidadAnterior - cantidadMov;

        let nuevoCosto = parseFloat(stock.costoPromedio);
        if (esEntrada && parseFloat(costoUnitario) > 0) {
            nuevoCosto = calcularCostoPromedioPonderado(
                cantidadAnterior, stock.costoPromedio, cantidadMov, costoUnitario
            );
        }

        let nombreUsuario = null;
        if (idUsuario) {
            const usuario = await Usuario.findByPk(idUsuario, { transaction });
            if (usuario) {
                nombreUsuario = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim();
            }
        }

        const costoTotal = Math.round(cantidadMov * parseFloat(costoUnitario) * 100) / 100;

        const movimiento = await InvMovimiento.create({
            idEmpresa,
            idArticulo,
            idBodega,
            tipo,
            motivo,
            cantidad: cantidadMov,
            stockAnterior: cantidadAnterior,
            stockNuevo: cantidadDespues,
            costoUnitario: parseFloat(costoUnitario) || 0,
            costoTotal,
            costoPromedioResultante: nuevoCosto,
            idLote,
            documentoSoporte,
            idProveedor,
            idUsuario,
            nombreUsuario,
            observaciones
        }, { transaction });

        stock.cantidadFisica = cantidadDespues;
        stock.costoPromedio = nuevoCosto;
        stock.recalcularValorTotal();
        if (esEntrada) {
            stock.fechaUltimaEntrada = new Date();
        } else {
            stock.fechaUltimaSalida = new Date();
        }
        await stock.save({ transaction });

        await InvArticulo.update(
            { costoPromedio: nuevoCosto },
            { where: { idArticulo }, transaction }
        );

        await transaction.commit();

        logger.info(`Mov. inventario interno: ${tipo} de ${cantidadMov} para artículo ${idArticulo} (saldo: ${cantidadDespues})`);

        return { movimiento, stock };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error en movimiento inventario interno: ${error.message}`);
        throw error;
    }
};

// =====================================================
// AJUSTE POR CONTEO FÍSICO
// =====================================================

const ajustarPorConteo = async (datos) => {
    const { idEmpresa, idArticulo, cantidadReal, motivo, idUsuario } = datos;
    let idBodega = datos.idBodega;

    if (!idBodega) {
        const principal = await obtenerBodegaPrincipal(idEmpresa);
        idBodega = principal.idBodega;
    }

    const stock = await obtenerOCrearStock(idEmpresa, idArticulo, idBodega);
    const cantidadActual = parseFloat(stock.cantidadFisica);
    const real = parseFloat(cantidadReal);

    if (real === cantidadActual) {
        stock.fechaUltimoConteo = new Date();
        await stock.save();
        return { ajustado: false, mensaje: 'El conteo coincide con el sistema', cantidadActual };
    }

    const diferencia = Math.abs(real - cantidadActual);
    const tipo = real > cantidadActual ? 'ajuste_positivo' : 'ajuste_negativo';

    const resultado = await registrarMovimiento({
        idEmpresa,
        idArticulo,
        idBodega,
        tipo,
        cantidad: diferencia,
        costoUnitario: parseFloat(stock.costoPromedio),
        idUsuario,
        motivo: motivo || 'Ajuste por conteo físico',
        observaciones: `Conteo: ${real}. Sistema antes: ${cantidadActual}. Diferencia: ${tipo === 'ajuste_positivo' ? '+' : '-'}${diferencia}`
    });

    await InvStock.update(
        { fechaUltimoConteo: new Date() },
        { where: { idStock: stock.idStock } }
    );

    return {
        ajustado: true,
        diferencia,
        tipo,
        cantidadAnterior: cantidadActual,
        cantidadNueva: real,
        movimiento: resultado.movimiento
    };
};

// =====================================================
// KARDEX
// =====================================================

const obtenerKardex = async (idEmpresa, idArticulo, filtros = {}) => {
    const { Op } = require('sequelize');
    const where = { idEmpresa, idArticulo };

    if (filtros.tipo) where.tipo = filtros.tipo;
    if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fecha_creacion = {};
        if (filtros.fechaDesde) where.fecha_creacion[Op.gte] = new Date(filtros.fechaDesde);
        if (filtros.fechaHasta) where.fecha_creacion[Op.lte] = new Date(filtros.fechaHasta);
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = Math.min(parseInt(filtros.limit, 10) || 50, 200);
    const offset = (pagina - 1) * limit;

    const { count, rows } = await InvMovimiento.findAndCountAll({
        where,
        limit,
        offset,
        order: [['fecha_creacion', 'DESC']]
    });

    return {
        movimientos: rows.map(m => m.datosKardex()),
        paginacion: { pagina, limit, total: count, totalPaginas: Math.ceil(count / limit) }
    };
};

// =====================================================
// RESUMEN EJECUTIVO
// =====================================================

const obtenerResumen = async (idEmpresa) => {
    const stocks = await InvStock.findAll({ where: { idEmpresa } });

    let totalArticulosConStock = 0;
    let valorTotalInventario = 0;
    let unidadesTotales = 0;

    for (const s of stocks) {
        const cantidad = parseFloat(s.cantidadFisica);
        valorTotalInventario += parseFloat(s.valorTotal);
        if (cantidad > 0) {
            totalArticulosConStock += 1;
            unidadesTotales += cantidad;
        }
    }

    const articulos = await InvArticulo.findAll({
        where: { idEmpresa, eliminado: false, activo: true }
    });
    const totalArticulos = articulos.length;

    const mapaStock = {};
    stocks.forEach(s => {
        mapaStock[s.idArticulo] = (mapaStock[s.idArticulo] || 0) + parseFloat(s.cantidadFisica);
    });

    // Stock bajo: usa puntoReorden si existe, si no el stockMinimo
    let articulosStockBajo = 0;
    for (const art of articulos) {
        const fisico = mapaStock[art.idArticulo] || 0;
        const umbral = parseFloat(art.puntoReorden) > 0
            ? parseFloat(art.puntoReorden)
            : parseFloat(art.stockMinimo) || 0;
        if (umbral > 0 && fisico <= umbral) articulosStockBajo += 1;
    }

    return {
        totalArticulos,
        totalArticulosConStock,
        unidadesTotales: Math.round(unidadesTotales * 1000) / 1000,
        valorTotalInventario: Math.round(valorTotalInventario * 100) / 100,
        articulosStockBajo
    };
};

// =====================================================
// ARTÍCULOS CON STOCK BAJO
// =====================================================

const obtenerArticulosStockBajo = async (idEmpresa) => {
    const articulos = await InvArticulo.findAll({
        where: { idEmpresa, eliminado: false, activo: true },
        order: [['nombre', 'ASC']]
    });

    const stocks = await InvStock.findAll({ where: { idEmpresa } });
    const mapaStock = {};
    stocks.forEach(s => {
        mapaStock[s.idArticulo] = (mapaStock[s.idArticulo] || 0) + parseFloat(s.cantidadFisica);
    });

    const resultado = [];
    for (const art of articulos) {
        const fisico = mapaStock[art.idArticulo] || 0;
        const minimo = parseFloat(art.stockMinimo) || 0;
        const reorden = parseFloat(art.puntoReorden) || 0;
        const umbral = reorden > 0 ? reorden : minimo;

        // Solo entran los que tienen umbral definido y están en o bajo el umbral, o agotados
        const estaBajo = umbral > 0 && fisico <= umbral;
        const agotado = fisico <= 0;

        if (estaBajo || agotado) {
            resultado.push({
                idArticulo: art.idArticulo,
                nombre: art.nombre,
                codigoInterno: art.codigoInterno,
                unidadMedida: art.unidadMedida,
                cantidadFisica: Math.round(fisico * 1000) / 1000,
                stockMinimo: minimo,
                puntoReorden: reorden,
                estado: agotado ? 'agotado' : 'bajo'
            });
        }
    }

    return resultado;
};

// =====================================================
// TRANSFERENCIA ENTRE BODEGAS
// =====================================================

const transferirEntreBodegas = async (datos) => {
    const transaction = await sequelize.transaction();

    try {
        const { idEmpresa, idArticulo, idBodegaOrigen, idBodegaDestino, cantidad, idUsuario, motivo } = datos;

        if (!idEmpresa || !idArticulo || !idBodegaOrigen || !idBodegaDestino || !cantidad) {
            throw new Error('Faltan datos obligatorios para la transferencia');
        }
        if (idBodegaOrigen === idBodegaDestino) {
            throw new Error('La bodega de origen y destino no pueden ser la misma');
        }
        const cantidadMov = parseFloat(cantidad);
        if (cantidadMov <= 0) throw new Error('La cantidad debe ser mayor a cero');

        const stockOrigen = await obtenerOCrearStock(idEmpresa, idArticulo, idBodegaOrigen, transaction);
        const cantidadOrigen = parseFloat(stockOrigen.cantidadFisica);
        if (cantidadOrigen < cantidadMov) {
            throw new Error(`Stock insuficiente en la bodega de origen. Disponible: ${cantidadOrigen}, solicitado: ${cantidadMov}`);
        }

        const stockDestino = await obtenerOCrearStock(idEmpresa, idArticulo, idBodegaDestino, transaction);
        const cantidadDestino = parseFloat(stockDestino.cantidadFisica);
        const costoUnitario = parseFloat(stockOrigen.costoPromedio);

        let nombreUsuario = null;
        if (idUsuario) {
            const usuario = await Usuario.findByPk(idUsuario, { transaction });
            if (usuario) nombreUsuario = `${usuario.nombres || ''} ${usuario.apellidos || ''}`.trim();
        }

        const nuevaCantOrigen = cantidadOrigen - cantidadMov;
        await InvMovimiento.create({
            idEmpresa, idArticulo, idBodega: idBodegaOrigen, idBodegaDestino,
            tipo: 'transferencia',
            motivo: motivo || 'Transferencia entre bodegas (salida)',
            cantidad: cantidadMov, stockAnterior: cantidadOrigen, stockNuevo: nuevaCantOrigen,
            costoUnitario, costoTotal: Math.round(cantidadMov * costoUnitario * 100) / 100,
            costoPromedioResultante: costoUnitario,
            idUsuario, nombreUsuario, observaciones: 'Salida por transferencia'
        }, { transaction });

        stockOrigen.cantidadFisica = nuevaCantOrigen;
        stockOrigen.recalcularValorTotal();
        stockOrigen.fechaUltimaSalida = new Date();
        await stockOrigen.save({ transaction });

        const nuevaCantDestino = cantidadDestino + cantidadMov;
        const nuevoCostoDestino = calcularCostoPromedioPonderado(
            cantidadDestino, stockDestino.costoPromedio, cantidadMov, costoUnitario
        );
        await InvMovimiento.create({
            idEmpresa, idArticulo, idBodega: idBodegaDestino, idBodegaDestino: idBodegaOrigen,
            tipo: 'transferencia',
            motivo: motivo || 'Transferencia entre bodegas (entrada)',
            cantidad: cantidadMov, stockAnterior: cantidadDestino, stockNuevo: nuevaCantDestino,
            costoUnitario, costoTotal: Math.round(cantidadMov * costoUnitario * 100) / 100,
            costoPromedioResultante: nuevoCostoDestino,
            idUsuario, nombreUsuario, observaciones: 'Entrada por transferencia'
        }, { transaction });

        stockDestino.cantidadFisica = nuevaCantDestino;
        stockDestino.costoPromedio = nuevoCostoDestino;
        stockDestino.recalcularValorTotal();
        stockDestino.fechaUltimaEntrada = new Date();
        await stockDestino.save({ transaction });

        await transaction.commit();
        logger.info(`Transferencia inv interna: ${cantidadMov} de art ${idArticulo}`);

        return {
            transferido: true,
            cantidad: cantidadMov,
            origen: { idBodega: idBodegaOrigen, stockNuevo: nuevaCantOrigen },
            destino: { idBodega: idBodegaDestino, stockNuevo: nuevaCantDestino }
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error en transferencia inv interna: ${error.message}`);
        throw error;
    }
};

module.exports = {
    crearBodegaPrincipal,
    obtenerBodegaPrincipal,
    obtenerOCrearStock,
    calcularCostoPromedioPonderado,
    registrarMovimiento,
    ajustarPorConteo,
    obtenerKardex,
    obtenerResumen,
    obtenerArticulosStockBajo,
    transferirEntreBodegas
};