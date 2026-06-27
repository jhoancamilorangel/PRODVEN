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
 */

// =====================================================
// GENERACIÓN DEL NÚMERO DE ORDEN
// =====================================================

/**
 * Genera un número de orden consecutivo legible por empresa
 * Formato: OP-AÑO-NNNN (ej: OP-2026-0001)
 */
const generarNumeroOrden = async (idEmpresa, transaction) => {
    const anio = new Date().getFullYear();
    const prefijo = `OP-${anio}-;`

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
 * Crea una orden de producción usando el BOM activo del producto
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

// =====================================================
// INICIAR PRODUCCIÓN (consumir materiales)
// =====================================================

/**
 * Inicia una orden de producción consumiendo los materiales del inventario
 */
const iniciarProduccion = async (idOrden, idEmpresa, idUsuario) => {
    const orden = await OrdenProduccion.findOne({
        where: { idOrden, idEmpresa, eliminado: false }
    });

    if (!orden) {
        throw new Error('Orden de producción no encontrada');
    }

    if (!orden.puedeIniciar()) {
        throw new Error(`No se puede iniciar una orden en estado: ${orden.estado}`);
    }

    const verificacion = await verificarDisponibilidadMateriales(
        orden.idBom,
        parseFloat(orden.cantidadProducir),
        idEmpresa,
        orden.idBodega
    );

    if (!verificacion.disponible) {
        return {
            exito: false,
            orden,
            mensaje: 'No hay suficiente stock de materiales para iniciar la producción',
            faltantes: verificacion.faltantes
        };
    }

    const materiales = await calcularMaterialesNecesarios(
        orden.idBom,
        parseFloat(orden.cantidadProducir),
        idEmpresa
    );

    const consumos = [];
    let costoMaterialesReal = 0;

    for (const material of materiales) {
        const stock = await StockProducto.findOne({
            where: {
                idProducto: material.idProductoComponente,
                idBodega: orden.idBodega
            }
        });

        const disponible = stock ? stock.cantidadDisponible() : 0;

        if (disponible < material.cantidadNecesaria) {
            if (material.esOpcional) {
                continue;
            }
            throw new Error(`Stock insuficiente del material ${material.idProductoComponente}`);
        }

        const resultadoMovimiento = await inventarioService.registrarMovimiento({
            idEmpresa,
            idProducto: material.idProductoComponente,
            idBodega: orden.idBodega,
            tipo: 'salida_produccion',
            cantidad: material.cantidadNecesaria,
            idUsuario,
            motivo: `Consumo en orden de producción ${orden.numeroOrden}`,
            referencia: {
                tipo: 'orden_produccion',
                id: orden.idOrden
            }
        });

        const costoUnitarioReal = parseFloat(resultadoMovimiento.movimiento.costoUnitario);
        const costoTotalConsumo = Math.round(material.cantidadNecesaria * costoUnitarioReal * 100) / 100;
        costoMaterialesReal += costoTotalConsumo;

        const consumo = await ConsumoOrden.create({
            idEmpresa,
            idOrden: orden.idOrden,
            idProductoComponente: material.idProductoComponente,
            idComponenteBom: material.idComponenteBom,
            cantidadPlanificada: material.cantidadNecesaria,
            cantidadConsumida: material.cantidadNecesaria,
            cantidadMermaReal: 0,
            unidadMedida: material.unidadMedida,
            costoUnitario: costoUnitarioReal,
            costoTotal: costoTotalConsumo,
            idMovimientoInventario: resultadoMovimiento.movimiento.idMovimiento,
            idBodega: orden.idBodega
        });

        consumos.push(consumo);
    }

    costoMaterialesReal = Math.round(costoMaterialesReal * 100) / 100;

    orden.estado = 'en_proceso';
    orden.fechaInicio = new Date();
    orden.materialesReservados = true;
    orden.materialesConsumidos = true;
    orden.costoMaterialesReal = costoMaterialesReal;
    orden.recalcularCostos();

    if (idUsuario && !orden.idResponsableProduccion) {
        orden.idResponsableProduccion = idUsuario;
    }

    await orden.save();

    logger.info(`Orden ${orden.numeroOrden} iniciada. ${consumos.length} materiales consumidos.`);

    return {
        exito: true,
        orden,
        consumos: consumos.map(c => c.datosCompletos()),
        mensaje: 'Producción iniciada y materiales consumidos correctamente'
    };
};

// =====================================================
// COMPLETAR PRODUCCIÓN (ingresar producto terminado)
// =====================================================

/**
 * Completa una orden de producción ingresando el producto terminado al inventario
 */
const completarProduccion = async (datos, idEmpresa, idUsuario) => {
    const transaction = await sequelize.transaction();

    try {
        const orden = await OrdenProduccion.findOne({
            where: { idOrden: datos.idOrden, idEmpresa, eliminado: false },
            transaction
        });

        if (!orden) {
            throw new Error('Orden de producción no encontrada');
        }

        if (!orden.puedeCompletar()) {
            throw new Error(`No se puede completar una orden en estado: ${orden.estado}`);
        }

        const cantidadProducida = parseFloat(datos.cantidadProducida);
        const cantidadDefectuosa = parseFloat(datos.cantidadDefectuosa) || 0;

        if (cantidadProducida <= 0) {
            throw new Error('La cantidad producida debe ser mayor a cero');
        }

        if (cantidadDefectuosa > cantidadProducida) {
            throw new Error('La cantidad defectuosa no puede ser mayor a la producida');
        }

        const cantidadBuena = cantidadProducida - cantidadDefectuosa;

        if (datos.mermas && Array.isArray(datos.mermas)) {
            for (const merma of datos.mermas) {
                const consumo = await ConsumoOrden.findOne({
                    where: {
                        idOrden: orden.idOrden,
                        idProductoComponente: merma.idProductoComponente
                    },
                    transaction
                });

                if (consumo && parseFloat(merma.cantidadMerma) > 0) {
                    const cantidadMerma = parseFloat(merma.cantidadMerma);

                    await inventarioService.registrarMovimiento({
                        idEmpresa,
                        idProducto: merma.idProductoComponente,
                        idBodega: orden.idBodega,
                        tipo: 'salida_merma',
                        cantidad: cantidadMerma,
                        idUsuario,
                        motivo: `Merma real en orden ${orden.numeroOrden}`,
                        referencia: {
                            tipo: 'orden_produccion',
                            id: orden.idOrden
                        }
                    });

                    consumo.cantidadMermaReal = cantidadMerma;
                    consumo.cantidadConsumida = parseFloat(consumo.cantidadConsumida) + cantidadMerma;
                    consumo.recalcularCosto();
                    await consumo.save({ transaction });
                }
            }
        }

        if (datos.costoManoObra !== undefined) {
            orden.costoManoObra = parseFloat(datos.costoManoObra);
        }
        if (datos.costoIndirecto !== undefined) {
            orden.costoIndirecto = parseFloat(datos.costoIndirecto);
        }

        const consumosActualizados = await ConsumoOrden.findAll({
            where: { idOrden: orden.idOrden },
            transaction
        });

        let costoMaterialesReal = 0;
        for (const consumo of consumosActualizados) {
            costoMaterialesReal += parseFloat(consumo.costoTotal);
        }
        orden.costoMaterialesReal = Math.round(costoMaterialesReal * 100) / 100;

        orden.cantidadProducida = cantidadProducida;
        orden.cantidadDefectuosa = cantidadDefectuosa;
        orden.recalcularCostos();

        const costoUnitarioReal = parseFloat(orden.costoUnitarioReal);

        await transaction.commit();

        if (cantidadBuena > 0) {
            await inventarioService.registrarMovimiento({
                idEmpresa,
                idProducto: orden.idProducto,
                idBodega: orden.idBodega,
                tipo: 'entrada_produccion',
                cantidad: cantidadBuena,
                costoUnitario: costoUnitarioReal,
                idUsuario,
                motivo: `Producto terminado de orden ${orden.numeroOrden}`,
                referencia: {
                    tipo: 'orden_produccion',
                    id: orden.idOrden
                }
            });
        }

        orden.estado = 'completada';
        orden.fechaFin = new Date();
        orden.productoIngresado = true;
        await orden.save();

        logger.info(`Orden ${orden.numeroOrden} completada. ${cantidadBuena} unidades buenas ingresadas al inventario.`);

        return {
            exito: true,
            orden: orden.datosCompletos(),
            mensaje: `Producción completada. ${cantidadBuena} unidades ingresadas al inventario.`
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al completar producción: ${error.message}`);
        throw error;
    }
};

// =====================================================
// CANCELAR ORDEN (reversión segura según estado)
// =====================================================

/**
 * Cancela una orden de producción revirtiendo según su estado
 */
const cancelarOrden = async (idOrden, motivo, idEmpresa, idUsuario) => {
    const orden = await OrdenProduccion.findOne({
        where: { idOrden, idEmpresa, eliminado: false }
    });

    if (!orden) {
        throw new Error('Orden de producción no encontrada');
    }

    if (!orden.puedeCancelar()) {
        throw new Error(`No se puede cancelar una orden en estado: ${orden.estado}`);
    }

    if (!motivo || motivo.trim().length < 5) {
        throw new Error('Debes proporcionar un motivo de cancelación de al menos 5 caracteres');
    }

    let materialesRevertidos = 0;

    if (orden.materialesConsumidos) {
        const consumos = await ConsumoOrden.findAll({
            where: { idOrden: orden.idOrden }
        });

        for (const consumo of consumos) {
            const cantidadADevolver = parseFloat(consumo.cantidadConsumida);

            if (cantidadADevolver > 0) {
                await inventarioService.registrarMovimiento({
                    idEmpresa,
                    idProducto: consumo.idProductoComponente,
                    idBodega: consumo.idBodega || orden.idBodega,
                    tipo: 'entrada_ajuste',
                    cantidad: cantidadADevolver,
                    costoUnitario: parseFloat(consumo.costoUnitario),
                    idUsuario,
                    motivo: `Reversión por cancelación de orden ${orden.numeroOrden}`,
                    referencia: {
                        tipo: 'orden_produccion',
                        id: orden.idOrden
                    }
                });
                materialesRevertidos += 1;
            }
        }
    }

    orden.estado = 'cancelada';
    orden.fechaCancelacion = new Date();
    orden.motivoCancelacion = motivo;
    await orden.save();

    logger.info(`Orden ${orden.numeroOrden} cancelada. ${materialesRevertidos} materiales revertidos al inventario.`);

    return {
        exito: true,
        orden: orden.datosCompletos(),
        mensaje: materialesRevertidos > 0
            ? `Orden cancelada. ${materialesRevertidos} material(es) devuelto(s) al inventario.`
            : 'Orden cancelada correctamente.'
    };
};

// =====================================================
// CONSULTA DE CONSUMOS
// =====================================================

/**
 * Obtiene los consumos de una orden con sus desviaciones
 */
const obtenerConsumosOrden = async (idOrden, idEmpresa) => {
    const consumos = await ConsumoOrden.findAll({
        where: { idOrden, idEmpresa },
        order: [['fecha_creacion', 'ASC']]
    });

    return consumos.map(c => c.datosCompletos());
};

module.exports = {
    generarNumeroOrden,
    calcularMaterialesNecesarios,
    verificarDisponibilidadMateriales,
    crearOrdenProduccion,
    iniciarProduccion,
    completarProduccion,
    cancelarOrden,
    obtenerConsumosOrden
};