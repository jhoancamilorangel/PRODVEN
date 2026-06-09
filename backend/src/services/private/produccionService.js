const OrdenProduccion = require('../../models/OrdenProduccion');
const ConsumoOrden = require('../../models/ConsumoOrden');
const BillOfMaterials = require('../../models/BillOfMaterials');
const ComponenteBOM = require('../../models/ComponenteBOM');
const Producto = require('../../models/Producto');
const StockProducto = require('../../models/StockProducto');
const Usuario = require('../../models/Usuario');
const bomService = require('./bomService');
const inventarioService = require('./inventarioService');
const reservaService = require('./reservaService');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Producción
 *
 * Orquesta el ciclo completo de las órdenes de producción:
 *  - Crear orden con cálculo de materiales necesarios
 *  - Verificar disponibilidad de materiales
 *  - Iniciar producción (consumir materiales del inventario)
 *  - Completar producción (ingresar producto terminado)
 *  - Cancelar con reversión segura según el estado
 *
 * Conecta BOM, inventario, reservas y movimientos en el flujo productivo.
 */

// =====================================================
// GENERACIÓN DEL NÚMERO DE ORDEN
// =====================================================

/**
 * Genera un número de orden consecutivo legible por empresa
 * Formato: OP-AÑO-NNNN (ej: OP-2026-0001)
 *
 * @param {string} idEmpresa - Empresa
 * @param {object} transaction - Transacción
 * @returns {Promise<string>} Número de orden generado
 */
const generarNumeroOrden = async (idEmpresa, transaction) => {
    const anio = new Date().getFullYear();
    const prefijo = `OP-${anio}-`;

    const ultimaOrden = await OrdenProduccion.findOne({
        where: {
            idEmpresa,
            numeroOrden: { [require('sequelize').Op.like]: `${prefijo}%` }
        },
        order: [['numero_orden', 'DESC']],
        transaction
    });

    let consecutivo = 1;
    if (ultimaOrden) {
        const partes = ultimaOrden.numeroOrden.split('-');
        const ultimoNumero = parseInt(partes[2], 10);
        consecutivo = ultimoNumero + 1;
    }

    const numeroFormateado = String(consecutivo).padStart(4, '0');
    return `${prefijo}${numeroFormateado}`;
};

// =====================================================
// CÁLCULO DE MATERIALES NECESARIOS
// =====================================================

/**
 * Calcula los materiales necesarios para producir una cantidad dada
 * basándose en el BOM activo del producto
 *
 * @param {string} idBom - BOM a usar
 * @param {number} cantidadAProducir - Cuánto se quiere fabricar
 * @param {string} idEmpresa - Empresa
 * @param {object} transaction - Transacción opcional
 * @returns {Promise<Array>} Lista de materiales con cantidades necesarias
 */
const calcularMaterialesNecesarios = async (idBom, cantidadAProducir, idEmpresa, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    const bom = await BillOfMaterials.findByPk(idBom, opciones);

    if (!bom) {
        throw new Error('BOM no encontrado');
    }

    const componentes = await ComponenteBOM.findAll({
        where: { idBom, eliminado: false },
        ...opciones
    });

    const cantidadBaseBom = parseFloat(bom.cantidadProduce) || 1;
    const materiales = [];

    for (const componente of componentes) {
        const cantidadNecesaria = componente.calcularCantidadParaProduccion(
            cantidadAProducir,
            cantidadBaseBom
        );

        materiales.push({
            idComponenteBom: componente.idComponente,
            idProductoComponente: componente.idProductoComponente,
            cantidadNecesaria,
            unidadMedida: componente.unidadMedida,
            costoUnitario: parseFloat(componente.costoUnitarioComponente),
            esOpcional: componente.esOpcional,
            esSustituible: componente.esSustituible,
            idProductoSustituto: componente.idProductoSustituto
        });
    }

    return materiales;
};

/**
 * Verifica si hay suficiente stock disponible de todos los materiales
 * necesarios para una orden de producción
 *
 * @param {string} idBom - BOM a verificar
 * @param {number} cantidadAProducir - Cantidad a fabricar
 * @param {string} idEmpresa - Empresa
 * @param {string} idBodega - Bodega de donde se consumirá
 * @returns {Promise<object>} { disponible, materiales, faltantes }
 */
const verificarDisponibilidadMateriales = async (idBom, cantidadAProducir, idEmpresa, idBodega = null) => {
    const materiales = await calcularMaterialesNecesarios(idBom, cantidadAProducir, idEmpresa);

    let bodegaId = idBodega;
    if (!bodegaId) {
        const bodegaPrincipal = await inventarioService.obtenerBodegaPrincipal(idEmpresa);
        bodegaId = bodegaPrincipal ? bodegaPrincipal.idBodega : null;
    }

    const detalleMateriales = [];
    const faltantes = [];

    for (const material of materiales) {
        const stock = await StockProducto.findOne({
            where: {
                idProducto: material.idProductoComponente,
                idBodega: bodegaId
            }
        });

        const producto = await Producto.findByPk(material.idProductoComponente);
        const disponible = stock ? stock.cantidadDisponible() : 0;
        const suficiente = disponible >= material.cantidadNecesaria;

        const detalle = {
            idProductoComponente: material.idProductoComponente,
            nombreProducto: producto ? producto.nombre : 'Desconocido',
            cantidadNecesaria: material.cantidadNecesaria,
            cantidadDisponible: disponible,
            unidadMedida: material.unidadMedida,
            suficiente,
            esOpcional: material.esOpcional
        };

        detalleMateriales.push(detalle);

        if (!suficiente && !material.esOpcional) {
            faltantes.push({
                ...detalle,
                faltante: Math.round((material.cantidadNecesaria - disponible) * 10000) / 10000
            });
        }
    }

    return {
        disponible: faltantes.length === 0,
        bodegaId,
        materiales: detalleMateriales,
        faltantes
    };
};

// =====================================================
// CREACIÓN DE ORDEN DE PRODUCCIÓN
// =====================================================

/**
 * Crea una orden de producción
 *
 * Usa el BOM activo del producto, calcula materiales y costos estimados.
 * La orden nace en estado pendiente sin reservar materiales todavía.
 *
 * @param {object} datos - Datos de la orden
 * @param {string} idEmpresa - Empresa
 * @param {string} idUsuario - Usuario creador
 * @returns {Promise<object>} { exito, orden, mensaje, verificacion }
 */
const crearOrdenProduccion = async (datos, idEmpresa, idUsuario) => {
    const transaction = await sequelize.transaction();

    try {
        const producto = await Producto.findOne({
            where: { idProducto: datos.idProducto, idEmpresa, eliminado: false },
            transaction
        });

        if (!producto) {
            throw new Error('Producto no encontrado');
        }

        if (!producto.esFabricado) {
            throw new Error('El producto no está marcado como fabricado');
        }

        const bomActivo = await bomService.obtenerBomActivo(datos.idProducto, idEmpresa);

        if (!bomActivo) {
            throw new Error('El producto no tiene una receta (BOM) activa. Crea y activa una receta primero.');
        }

        let idBodega = datos.idBodega;
        if (!idBodega) {
            const bodegaPrincipal = await inventarioService.obtenerBodegaPrincipal(idEmpresa);
            idBodega = bodegaPrincipal ? bodegaPrincipal.idBodega : null;
        }

        const cantidadAProducir = parseFloat(datos.cantidadProducir);

        const materiales = await calcularMaterialesNecesarios(
            bomActivo.idBom,
            cantidadAProducir,
            idEmpresa,
            transaction
        );

        let costoMaterialesEstimado = 0;
        for (const material of materiales) {
            costoMaterialesEstimado += material.cantidadNecesaria * material.costoUnitario;
        }
        costoMaterialesEstimado = Math.round(costoMaterialesEstimado * 100) / 100;

        const numeroOrden = await generarNumeroOrden(idEmpresa, transaction);

        let nombreCreador = null;
        if (idUsuario) {
            const usuario = await Usuario.findByPk(idUsuario, { transaction });
            if (usuario) {
                nombreCreador = `${usuario.nombre} ${usuario.apellido || ''}`.trim();
            }
        }

        const factorProporcion = cantidadAProducir / (parseFloat(bomActivo.cantidadProduce) || 1);
        const costoManoObra = Math.round(parseFloat(bomActivo.costoManoObraUnitario) * factorProporcion * 100) / 100;
        const costoIndirecto = Math.round(parseFloat(bomActivo.costoIndirectoUnitario) * factorProporcion * 100) / 100;

        const orden = await OrdenProduccion.create({
            idEmpresa,
            numeroOrden,
            idProducto: datos.idProducto,
            idBom: bomActivo.idBom,
            numeroVersionBom: bomActivo.numeroVersion,
            cantidadProducir: cantidadAProducir,
            unidadMedida: producto.unidadMedida,
            idBodega,
            estado: 'pendiente',
            prioridad: datos.prioridad || 'normal',
            fechaPlanificada: datos.fechaPlanificada || null,
            costoMaterialesEstimado,
            costoManoObra,
            costoIndirecto,
            idCreador: idUsuario,
            nombreCreador,
            idResponsableProduccion: datos.idResponsableProduccion || null,
            observaciones: datos.observaciones || null
        }, { transaction });

        await transaction.commit();

        const verificacion = await verificarDisponibilidadMateriales(
            bomActivo.idBom,
            cantidadAProducir,
            idEmpresa,
            idBodega
        );

        logger.info(`Orden de producción creada: ${numeroOrden} para ${cantidadAProducir} unidades de ${datos.idProducto}`);

        return {
            exito: true,
            orden,
            mensaje: 'Orden de producción creada correctamente',
            verificacion
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear orden de producción: ${error.message}`);
        throw error;
    }
};

module.exports = {
    generarNumeroOrden,
    calcularMaterialesNecesarios,
    verificarDisponibilidadMateriales,
    crearOrdenProduccion
};