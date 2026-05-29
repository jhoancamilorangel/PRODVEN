const MovimientoInventario = require('../../models/MovimientoInventario');
const StockProducto = require('../../models/StockProducto');
const Bodega = require('../../models/Bodega');
const Producto = require('../../models/Producto');
const Usuario = require('../../models/Usuario');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Inventario
 *
 * Cerebro del sistema de inventario. Maneja:
 *  - Creación de movimientos con actualización atómica de saldos
 *  - Cálculo de costo promedio ponderado en cada entrada
 *  - Sincronización entre StockProducto y el campo cantidadStock del Producto
 *  - Consulta del kardex (historial detallado)
 *  - Creación automática de la bodega principal al crear empresa
 *
 * Todo cambio de stock pasa por aquí. Nada toca el inventario por fuera.
 */

// =====================================================
// GESTIÓN DE BODEGAS
// =====================================================

/**
 * Crea la bodega principal de una empresa
 * Se llama automáticamente al registrar una nueva empresa
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {object} datos - Datos opcionales de la bodega
 * @returns {Promise<Bodega>} Bodega principal creada
 */
const crearBodegaPrincipal = async (idEmpresa, datos = {}) => {
    const existente = await Bodega.findOne({
        where: { idEmpresa, esPrincipal: true, eliminado: false }
    });

    if (existente) {
        return existente;
    }

    const bodega = await Bodega.create({
        idEmpresa,
        nombre: datos.nombre || 'Bodega Principal',
        codigo: datos.codigo || 'PRIN',
        descripcion: datos.descripcion || 'Bodega principal creada automáticamente',
        direccion: datos.direccion || null,
        ciudad: datos.ciudad || null,
        esPrincipal: true,
        permiteVentas: true,
        permiteProduccion: true
    });

    logger.info(`Bodega principal creada para empresa ${idEmpresa}: ${bodega.idBodega}`);
    return bodega;
};

/**
 * Obtiene la bodega principal de una empresa
 *
 * @param {string} idEmpresa - ID de la empresa
 * @returns {Promise<Bodega|null>} Bodega principal o null si no existe
 */
const obtenerBodegaPrincipal = async (idEmpresa) => {
    return await Bodega.findOne({
        where: { idEmpresa, esPrincipal: true, eliminado: false, activo: true }
    });
};

// =====================================================
// GESTIÓN DE STOCK POR PRODUCTO Y BODEGA
// =====================================================

/**
 * Obtiene o crea el registro de stock para un producto en una bodega
 * Si no existe, lo crea con cantidades en cero
 *
 * @param {string} idEmpresa - ID de la empresa
 * @param {string} idProducto - ID del producto
 * @param {string} idBodega - ID de la bodega
 * @param {object} transaction - Transacción de Sequelize opcional
 * @returns {Promise<StockProducto>} Registro de stock
 */
const obtenerOCrearStock = async (idEmpresa, idProducto, idBodega, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    let stock = await StockProducto.findOne({
        where: { idProducto, idBodega },
        ...opciones
    });

    if (!stock) {
        stock = await StockProducto.create({
            idEmpresa,
            idProducto,
            idBodega,
            cantidadFisica: 0,
            cantidadReservada: 0,
            cantidadEnTransito: 0,
            costoPromedio: 0,
            valorTotalInventario: 0
        }, opciones);
    }

    return stock;
};

/**
 * Sincroniza el campo cantidadStock del producto con la suma de
 * todas las cantidades físicas en todas sus bodegas
 *
 * @param {string} idProducto - ID del producto
 * @param {object} transaction - Transacción opcional
 * @returns {Promise<number>} Nuevo total sincronizado
 */
const sincronizarStockProducto = async (idProducto, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    const total = await StockProducto.sum('cantidadFisica', {
        where: { idProducto },
        ...opciones
    }) || 0;

    await Producto.update(
        { cantidadStock: total },
        { where: { idProducto }, ...opciones }
    );

    return parseFloat(total);
};

// =====================================================
// CÁLCULO DEL COSTO PROMEDIO PONDERADO
// =====================================================

/**
 * Calcula el nuevo costo promedio ponderado tras una entrada de mercancía
 *
 * Fórmula: ((cantidadActual * costoActual) + (cantidadNueva * costoNuevo))
 *           / (cantidadActual + cantidadNueva)
 *
 * @param {number} cantidadActual - Stock antes de la entrada
 * @param {number} costoActual - Costo promedio antes de la entrada
 * @param {number} cantidadNueva - Cantidad que entra
 * @param {number} costoNuevo - Costo unitario de lo que entra
 * @returns {number} Nuevo costo promedio ponderado
 */
const calcularCostoPromedioPonderado = (cantidadActual, costoActual, cantidadNueva, costoNuevo) => {
    const stock = parseFloat(cantidadActual) || 0;
    const costo = parseFloat(costoActual) || 0;
    const entra = parseFloat(cantidadNueva) || 0;
    const costoEntra = parseFloat(costoNuevo) || 0;

    const totalDespues = stock + entra;

    if (totalDespues <= 0) {
        return 0;
    }

    const valorTotalActual = stock * costo;
    const valorTotalNuevo = entra * costoEntra;
    const promedio = (valorTotalActual + valorTotalNuevo) / totalDespues;

    return Math.round(promedio * 100) / 100;
};

// =====================================================
// CREACIÓN DE MOVIMIENTOS DE INVENTARIO
// =====================================================

/**
 * Registra un movimiento de inventario y actualiza atómicamente
 * todos los saldos relacionados.
 *
 * Esta es LA función central del módulo. Todo cambio de stock
 * debe pasar por aquí para garantizar consistencia y trazabilidad.
 *
 * @param {object} datos - Datos del movimiento
 * @param {string} datos.idEmpresa - Empresa
 * @param {string} datos.idProducto - Producto afectado
 * @param {string} datos.tipo - Tipo de movimiento (entrada_compra, salida_venta, etc.)
 * @param {number} datos.cantidad - Cantidad a mover (siempre positiva)
 * @param {number} datos.costoUnitario - Costo por unidad (relevante en entradas)
 * @param {string} datos.idBodega - Bodega (opcional, usa principal si no se indica)
 * @param {string} datos.idUsuario - Usuario que registra
 * @param {string} datos.motivo - Descripción del motivo
 * @param {object} datos.referencia - { tipo, id } del origen del movimiento
 * @param {string} datos.documentoSoporte - Número de factura o documento
 * @param {string} datos.numeroLote - Lote, si aplica
 * @param {Date} datos.fechaVencimiento - Vencimiento, si aplica
 * @param {string} datos.idProveedor - Proveedor en entradas por compra
 * @param {string} datos.observaciones - Notas adicionales
 * @returns {Promise<object>} { movimiento, stockActualizado }
 */
const registrarMovimiento = async (datos) => {
    const transaction = await sequelize.transaction();

    try {
        const {
            idEmpresa,
            idProducto,
            tipo,
            cantidad,
            costoUnitario = 0,
            idUsuario = null,
            motivo = null,
            referencia = {},
            documentoSoporte = null,
            numeroLote = null,
            fechaVencimiento = null,
            idProveedor = null,
            observaciones = null
        } = datos;

        let idBodega = datos.idBodega;

        if (!idEmpresa || !idProducto || !tipo || !cantidad) {
            throw new Error('Faltan datos obligatorios para el movimiento');
        }

        if (parseFloat(cantidad) <= 0) {
            throw new Error('La cantidad debe ser mayor a cero');
        }

        if (!idBodega) {
            const bodegaPrincipal = await obtenerBodegaPrincipal(idEmpresa);
            if (!bodegaPrincipal) {
                throw new Error('La empresa no tiene bodega principal configurada');
            }
            idBodega = bodegaPrincipal.idBodega;
        }

        const naturaleza = MovimientoInventario.derivarNaturaleza(tipo);
        const esEntrada = naturaleza === 'entrada';

        const stock = await obtenerOCrearStock(idEmpresa, idProducto, idBodega, transaction);

        const cantidadAnterior = parseFloat(stock.cantidadFisica);
        const cantidadMovimiento = parseFloat(cantidad);

        if (!esEntrada && cantidadAnterior < cantidadMovimiento) {
            throw new Error(
                `Stock insuficiente en bodega. Disponible físico: ${cantidadAnterior}, solicitado: ${cantidadMovimiento}`
            );
        }

        const cantidadDespues = esEntrada
            ? cantidadAnterior + cantidadMovimiento
            : cantidadAnterior - cantidadMovimiento;

        let nuevoCostoPromedio = parseFloat(stock.costoPromedio);

        if (esEntrada && parseFloat(costoUnitario) > 0) {
            nuevoCostoPromedio = calcularCostoPromedioPonderado(
                cantidadAnterior,
                stock.costoPromedio,
                cantidadMovimiento,
                costoUnitario
            );
        }

        let nombreUsuario = null;
        if (idUsuario) {
            const usuario = await Usuario.findByPk(idUsuario, { transaction });
            if (usuario) {
                nombreUsuario = `${usuario.nombre} ${usuario.apellido || ''}`.trim();
            }
        }

        const costoTotal = Math.round(cantidadMovimiento * parseFloat(costoUnitario) * 100) / 100;

        const movimiento = await MovimientoInventario.create({
            idEmpresa,
            idProducto,
            idBodega,
            tipo,
            naturaleza,
            cantidad: cantidadMovimiento,
            stockAnterior: cantidadAnterior,
            stockNuevo: cantidadDespues,
            costoUnitario: parseFloat(costoUnitario) || 0,
            costoTotal,
            costoPromedioResultante: nuevoCostoPromedio,
            numeroLote,
            fechaVencimiento,
            referenciaTipo: referencia.tipo || null,
            referenciaId: referencia.id || null,
            idProveedor,
            documentoSoporte,
            motivo,
            observaciones,
            idUsuario,
            nombreUsuario
        }, { transaction });

        stock.cantidadFisica = cantidadDespues;
        stock.costoPromedio = nuevoCostoPromedio;
        stock.recalcularValorTotal();

        if (esEntrada) {
            stock.fechaUltimaEntrada = new Date();
        } else {
            stock.fechaUltimaSalida = new Date();
        }

        await stock.save({ transaction });

        await sincronizarStockProducto(idProducto, transaction);

        await transaction.commit();

        logger.info(
            `Movimiento registrado: ${tipo} de ${cantidadMovimiento} para producto ${idProducto} (saldo: ${cantidadDespues})`
        );

        return {
            movimiento,
            stockActualizado: stock
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al registrar movimiento: ${error.message}`);
        throw error;
    }
};

// =====================================================
// AJUSTES MANUALES DE INVENTARIO
// =====================================================

/**
 * Ajusta el stock físico de un producto por conteo manual.
 * Crea un movimiento de entrada_ajuste o salida_ajuste según corresponda.
 *
 * @param {object} datos - Datos del ajuste
 * @param {string} datos.idEmpresa - Empresa
 * @param {string} datos.idProducto - Producto
 * @param {number} datos.cantidadFisicaReal - Cantidad real contada
 * @param {string} datos.motivo - Razón del ajuste
 * @param {string} datos.idUsuario - Usuario responsable
 * @param {string} datos.idBodega - Bodega (opcional)
 * @returns {Promise<object>} Resultado del ajuste
 */
const ajustarInventarioPorConteo = async (datos) => {
    const {
        idEmpresa,
        idProducto,
        cantidadFisicaReal,
        motivo,
        idUsuario,
        idBodega: idBodegaSolicitada
    } = datos;

    let idBodega = idBodegaSolicitada;

    if (!idBodega) {
        const principal = await obtenerBodegaPrincipal(idEmpresa);
        if (!principal) {
            throw new Error('La empresa no tiene bodega principal configurada');
        }
        idBodega = principal.idBodega;
    }

    const stockActual = await obtenerOCrearStock(idEmpresa, idProducto, idBodega);
    const cantidadActual = parseFloat(stockActual.cantidadFisica);
    const cantidadReal = parseFloat(cantidadFisicaReal);

    if (cantidadReal === cantidadActual) {
        await StockProducto.update(
            { fechaUltimoConteo: new Date() },
            { where: { idStockProducto: stockActual.idStockProducto } }
        );

        return {
            ajustado: false,
            mensaje: 'El stock contado coincide con el del sistema, no se requiere ajuste',
            cantidadActual
        };
    }

    const diferencia = Math.abs(cantidadReal - cantidadActual);
    const tipo = cantidadReal > cantidadActual ? 'entrada_ajuste' : 'salida_ajuste';

    const resultado = await registrarMovimiento({
        idEmpresa,
        idProducto,
        idBodega,
        tipo,
        cantidad: diferencia,
        costoUnitario: parseFloat(stockActual.costoPromedio),
        idUsuario,
        motivo: motivo || 'Ajuste por conteo físico',
        observaciones: `Conteo físico: ${cantidadReal}. Sistema antes: ${cantidadActual}. Diferencia: ${tipo === 'entrada_ajuste' ? '+' : '-'}${diferencia}`
    });

    await StockProducto.update(
        { fechaUltimoConteo: new Date() },
        { where: { idStockProducto: stockActual.idStockProducto } }
    );

    return {
        ajustado: true,
        diferencia,
        tipo,
        cantidadAnterior: cantidadActual,
        cantidadNueva: cantidadReal,
        movimiento: resultado.movimiento
    };
};

// =====================================================
// CONSULTA DEL KARDEX
// =====================================================

/**
 * Obtiene el kardex completo de un producto en una bodega
 *
 * @param {string} idProducto - Producto a consultar
 * @param {object} filtros - { idBodega, fechaDesde, fechaHasta, tipo, pagina, limit }
 * @returns {Promise<object>} Movimientos paginados y resumen
 */
const obtenerKardex = async (idProducto, filtros = {}) => {
    const { Op } = require('sequelize');

    const where = { idProducto };

    if (filtros.idBodega) {
        where.idBodega = filtros.idBodega;
    }

    if (filtros.tipo) {
        where.tipo = filtros.tipo;
    }

    if (filtros.fechaDesde || filtros.fechaHasta) {
        where.fecha_creacion = {};
        if (filtros.fechaDesde) {
            where.fecha_creacion[Op.gte] = new Date(filtros.fechaDesde);
        }
        if (filtros.fechaHasta) {
            where.fecha_creacion[Op.lte] = new Date(filtros.fechaHasta);
        }
    }

    const pagina = parseInt(filtros.pagina, 10) || 1;
    const limit = Math.min(parseInt(filtros.limit, 10) || 50, 200);
    const offset = (pagina - 1) * limit;

    const { count, rows } = await MovimientoInventario.findAndCountAll({
        where,
        limit,
        offset,
        order: [['fecha_creacion', 'DESC']]
    });

    return {
        movimientos: rows.map(m => m.datosKardex()),
        paginacion: {
            pagina,
            limit,
            total: count,
            totalPaginas: Math.ceil(count / limit)
        }
    };
};

// =====================================================
// RESUMEN DE INVENTARIO POR EMPRESA
// =====================================================

/**
 * Obtiene un resumen del inventario de una empresa
 * Productos totales, valor total, productos con stock bajo, etc.
 *
 * @param {string} idEmpresa - Empresa a consultar
 * @returns {Promise<object>} Resumen completo
 */
const obtenerResumenInventario = async (idEmpresa) => {
    const stocks = await StockProducto.findAll({
        where: { idEmpresa }
    });

    let totalProductosConStock = 0;
    let valorTotalInventario = 0;
    let unidadesTotales = 0;
    let productosConStockBajo = 0;
    let productosConPuntoReorden = 0;

    for (const stock of stocks) {
        const cantidad = parseFloat(stock.cantidadFisica);
        const valor = parseFloat(stock.valorTotalInventario);

        if (cantidad > 0) {
            totalProductosConStock += 1;
            unidadesTotales += cantidad;
        }

        valorTotalInventario += valor;

        if (stock.tieneStockBajo()) {
            productosConStockBajo += 1;
        }

        if (stock.necesitaReorden()) {
            productosConPuntoReorden += 1;
        }
    }

    return {
        totalProductosConStock,
        unidadesTotales: Math.round(unidadesTotales * 1000) / 1000,
        valorTotalInventario: Math.round(valorTotalInventario * 100) / 100,
        productosConStockBajo,
        productosConPuntoReorden
    };
};

module.exports = {
    crearBodegaPrincipal,
    obtenerBodegaPrincipal,
    obtenerOCrearStock,
    sincronizarStockProducto,
    calcularCostoPromedioPonderado,
    registrarMovimiento,
    ajustarInventarioPorConteo,
    obtenerKardex,
    obtenerResumenInventario
};