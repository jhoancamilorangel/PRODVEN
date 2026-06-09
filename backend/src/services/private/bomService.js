const BillOfMaterials = require('../../models/BillOfMaterials');
const ComponenteBOM = require('../../models/ComponenteBOM');
const Producto = require('../../models/Producto');
const StockProducto = require('../../models/StockProducto');
const Usuario = require('../../models/Usuario');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Bill of Materials (Recetas)
 *
 * Maneja toda la lógica de las recetas de productos fabricados:
 *  - Crear versiones de BOM con numeración automática
 *  - Gestionar componentes con cálculo de costos
 *  - Activar versiones (desactivando la anterior)
 *  - Recalcular costos cuando cambian precios de materias primas
 *  - Sincronizar el costo calculado con el precioCosto del producto
 */

// =====================================================
// OBTENCIÓN DEL COSTO DE UN COMPONENTE
// =====================================================

/**
 * Obtiene el costo promedio actual de un producto desde su stock
 *
 * @param {string} idProducto - Producto del cual obtener el costo
 * @param {string} idEmpresa - Empresa propietaria
 * @returns {Promise<number>} Costo promedio del producto
 */
const obtenerCostoPromedioProducto = async (idProducto, idEmpresa) => {
    const stock = await StockProducto.findOne({
        where: { idProducto, idEmpresa }
    });

    if (stock && parseFloat(stock.costoPromedio) > 0) {
        return parseFloat(stock.costoPromedio);
    }

    const producto = await Producto.findOne({
        where: { idProducto, idEmpresa }
    });

    if (producto && parseFloat(producto.precioCosto) > 0) {
        return parseFloat(producto.precioCosto);
    }

    return 0;
};

// =====================================================
// CREACIÓN DE BOM
// =====================================================

/**
 * Crea una nueva versión de BOM para un producto
 *
 * El número de versión se calcula automáticamente: si ya existen
 * versiones, toma el número más alto y suma uno.
 *
 * @param {object} datos - Datos del BOM
 * @param {string} idEmpresa - Empresa propietaria
 * @param {string} idUsuario - Usuario creador
 * @returns {Promise<BillOfMaterials>} BOM creado
 */
const crearBom = async (datos, idEmpresa, idUsuario) => {
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
            throw new Error('El producto no está marcado como fabricado. Actívalo primero en el catálogo.');
        }

        const ultimaVersion = await BillOfMaterials.findOne({
            where: { idProducto: datos.idProducto },
            order: [['numero_version', 'DESC']],
            transaction
        });

        const numeroVersion = ultimaVersion ? ultimaVersion.numeroVersion + 1 : 1;

        let nombreCreador = null;
        if (idUsuario) {
            const usuario = await Usuario.findByPk(idUsuario, { transaction });
            if (usuario) {
                nombreCreador = `${usuario.nombre} ${usuario.apellido || ''}`.trim();
            }
        }

        const bom = await BillOfMaterials.create({
            idEmpresa,
            idProducto: datos.idProducto,
            numeroVersion,
            nombreVersion: datos.nombreVersion || `Versión ${numeroVersion}` ,
            esActiva: false,
            cantidadProduce: datos.cantidadProduce || 1,
            unidadProduccion: datos.unidadProduccion || producto.unidadMedida,
            tiempoEstimadoMinutos: datos.tiempoEstimadoMinutos || null,
            costoManoObraUnitario: datos.costoManoObraUnitario || 0,
            costoIndirectoUnitario: datos.costoIndirectoUnitario || 0,
            descripcion: datos.descripcion || null,
            instruccionesFabricacion: datos.instruccionesFabricacion || null,
            notasInternas: datos.notasInternas || null,
            estado: 'borrador',
            idCreador: idUsuario,
            nombreCreador
        }, { transaction });

        await transaction.commit();

        logger.info(`BOM creado: ${bom.idBom} versión ${numeroVersion} para producto ${datos.idProducto}`);

        return bom;
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear BOM: ${error.message}`);
        throw error;
    }
};

// =====================================================
// GESTIÓN DE COMPONENTES
// =====================================================

/**
 * Agrega un componente a un BOM y recalcula los costos
 *
 * @param {string} idBom - BOM al que agregar el componente
 * @param {object} datos - Datos del componente
 * @param {string} idEmpresa - Empresa propietaria
 * @returns {Promise<object>} { componente, bomActualizado }
 */
const agregarComponente = async (idBom, datos, idEmpresa) => {
    const transaction = await sequelize.transaction();

    try {
        const bom = await BillOfMaterials.findOne({
            where: { idBom, idEmpresa, eliminado: false },
            transaction
        });

        if (!bom) {
            throw new Error('BOM no encontrado');
        }

        if (!bom.esEditable()) {
            throw new Error('Solo se pueden modificar BOM en estado borrador');
        }

        if (datos.idProductoComponente === bom.idProducto) {
            throw new Error('Un producto no puede ser componente de sí mismo');
        }

        const productoComponente = await Producto.findOne({
            where: { idProducto: datos.idProductoComponente, idEmpresa, eliminado: false },
            transaction
        });

        if (!productoComponente) {
            throw new Error('Producto componente no encontrado');
        }

        const existente = await ComponenteBOM.findOne({
            where: {
                idBom,
                idProductoComponente: datos.idProductoComponente,
                eliminado: false
            },
            transaction
        });

        if (existente) {
            throw new Error('Este componente ya existe en la receta');
        }

        const costoUnitario = await obtenerCostoPromedioProducto(datos.idProductoComponente, idEmpresa);

        const componente = ComponenteBOM.build({
            idEmpresa,
            idBom,
            idProductoComponente: datos.idProductoComponente,
            cantidad: datos.cantidad,
            unidadMedida: datos.unidadMedida || productoComponente.unidadMedida,
            porcentajeMerma: datos.porcentajeMerma || 0,
            costoUnitarioComponente: costoUnitario,
            esOpcional: datos.esOpcional || false,
            esSustituible: datos.esSustituible || false,
            idProductoSustituto: datos.idProductoSustituto || null,
            ordenVisualizacion: datos.ordenVisualizacion || 0,
            notas: datos.notas || null
        });

        componente.calcularCantidadConMerma();
        componente.recalcularCosto();

        await componente.save({ transaction });

        await recalcularCostoBom(idBom, transaction);

        await transaction.commit();

        const bomActualizado = await BillOfMaterials.findByPk(idBom);

        logger.info(`Componente agregado al BOM ${idBom}: producto ${datos.idProductoComponente}`);

        return {
            componente,
            bomActualizado
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al agregar componente: ${error.message}`);
        throw error;
    }
};

/**
 * Elimina un componente de un BOM y recalcula costos
 *
 * @param {string} idBom - BOM
 * @param {string} idComponente - Componente a eliminar
 * @param {string} idEmpresa - Empresa propietaria
 * @returns {Promise<BillOfMaterials>} BOM actualizado
 */
const eliminarComponente = async (idBom, idComponente, idEmpresa) => {
    const transaction = await sequelize.transaction();

    try {
        const bom = await BillOfMaterials.findOne({
            where: { idBom, idEmpresa, eliminado: false },
            transaction
        });

        if (!bom) {
            throw new Error('BOM no encontrado');
        }

        if (!bom.esEditable()) {
            throw new Error('Solo se pueden modificar BOM en estado borrador');
        }

        const componente = await ComponenteBOM.findOne({
            where: { idComponente, idBom, eliminado: false },
            transaction
        });

        if (!componente) {
            throw new Error('Componente no encontrado');
        }

        componente.eliminado = true;
        componente.activo = false;
        await componente.save({ transaction });

        await recalcularCostoBom(idBom, transaction);

        await transaction.commit();

        const bomActualizado = await BillOfMaterials.findByPk(idBom);

        logger.info(`Componente ${idComponente} eliminado del BOM ${idBom}`);

        return bomActualizado;
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al eliminar componente: ${error.message}`);
        throw error;
    }
};

// =====================================================
// RECÁLCULO DE COSTOS
// =====================================================

/**
 * Recalcula el costo de materiales de un BOM sumando todos sus componentes
 * Actualiza también el costo total unitario
 *
 * @param {string} idBom - BOM a recalcular
 * @param {object} transaction - Transacción opcional
 * @returns {Promise<BillOfMaterials>} BOM con costos actualizados
 */
const recalcularCostoBom = async (idBom, transaction = null) => {
    const opciones = transaction ? { transaction } : {};

    const componentes = await ComponenteBOM.findAll({
        where: { idBom, eliminado: false },
        ...opciones
    });

    let costoMateriales = 0;
    for (const componente of componentes) {
        costoMateriales += parseFloat(componente.costoTotalComponente);
    }

    const bom = await BillOfMaterials.findByPk(idBom, opciones);

    const cantidadProduce = parseFloat(bom.cantidadProduce) || 1;
    const costoMaterialesUnitario = Math.round((costoMateriales / cantidadProduce) * 100) / 100;

    bom.costoMaterialesUnitario = costoMaterialesUnitario;
    bom.recalcularCostoTotal();

    await bom.save(opciones);

    return bom;
};

/**
 * Recalcula los costos de los componentes con los precios actuales
 * Útil cuando los costos de materias primas cambiaron
 *
 * @param {string} idBom - BOM a actualizar
 * @param {string} idEmpresa - Empresa propietaria
 * @returns {Promise<BillOfMaterials>} BOM actualizado
 */
const actualizarCostosConPreciosActuales = async (idBom, idEmpresa) => {
    const transaction = await sequelize.transaction();

    try {
        const bom = await BillOfMaterials.findOne({
            where: { idBom, idEmpresa, eliminado: false },
            transaction
        });

        if (!bom) {
            throw new Error('BOM no encontrado');
        }

        const componentes = await ComponenteBOM.findAll({
            where: { idBom, eliminado: false },
            transaction
        });

        for (const componente of componentes) {
            const costoActual = await obtenerCostoPromedioProducto(
                componente.idProductoComponente,
                idEmpresa
            );
            componente.costoUnitarioComponente = costoActual;
            componente.recalcularCosto();
            await componente.save({ transaction });
        }

        await recalcularCostoBom(idBom, transaction);

        await transaction.commit();

        const bomActualizado = await BillOfMaterials.findByPk(idBom);

        logger.info(`Costos del BOM ${idBom} actualizados con precios actuales`);

        return bomActualizado;
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al actualizar costos: ${error.message}`);
        throw error;
    }
};

// =====================================================
// ACTIVACIÓN DE VERSIONES
// =====================================================

/**
 * Activa una versión de BOM, desactivando cualquier otra versión activa
 * del mismo producto. Sincroniza el costo con el precioCosto del producto.
 *
 * @param {string} idBom - BOM a activar
 * @param {string} idEmpresa - Empresa propietaria
 * @param {string} idUsuario - Usuario que aprueba
 * @returns {Promise<BillOfMaterials>} BOM activado
 */
const activarBom = async (idBom, idEmpresa, idUsuario) => {
    const transaction = await sequelize.transaction();

    try {
        const bom = await BillOfMaterials.findOne({
            where: { idBom, idEmpresa, eliminado: false },
            transaction
        });

        if (!bom) {
            throw new Error('BOM no encontrado');
        }

        const totalComponentes = await ComponenteBOM.count({
            where: { idBom, eliminado: false },
            transaction
        });

        if (totalComponentes === 0) {
            throw new Error('No se puede activar un BOM sin componentes');
        }

        const ahora = new Date();

        await BillOfMaterials.update(
            {
                esActiva: false,
                fechaDesactivacion: ahora,
                estado: 'archivada'
            },
            {
                where: {
                    idProducto: bom.idProducto,
                    esActiva: true,
                    idBom: { [require('sequelize').Op.ne]: idBom }
                },
                transaction
            }
        );

        bom.esActiva = true;
        bom.estado = 'aprobada';
        bom.fechaActivacion = ahora;
        bom.fechaAprobacion = ahora;
        bom.idAprobador = idUsuario;
        await bom.save({ transaction });

        await Producto.update(
            { precioCosto: bom.costoTotalUnitario, esFabricado: true },
            { where: { idProducto: bom.idProducto }, transaction }
        );

        await transaction.commit();

        logger.info(`BOM ${idBom} activado para producto ${bom.idProducto}`);

        return bom;
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al activar BOM: ${error.message}`);
        throw error;
    }
};

// =====================================================
// CONSULTAS
// =====================================================

/**
 * Obtiene un BOM con todos sus componentes
 *
 * @param {string} idBom - BOM a consultar
 * @param {string} idEmpresa - Empresa propietaria
 * @returns {Promise<object>} BOM con sus componentes
 */
const obtenerBomCompleto = async (idBom, idEmpresa) => {
    const bom = await BillOfMaterials.findOne({
        where: { idBom, idEmpresa, eliminado: false }
    });

    if (!bom) {
        return null;
    }

    const componentes = await ComponenteBOM.findAll({
        where: { idBom, eliminado: false },
        order: [['orden_visualizacion', 'ASC'], ['fecha_creacion', 'ASC']]
    });

    return {
        bom: bom.datosCompletos(),
        componentes: componentes.map(c => c.datosCompletos())
    };
};

/**
 * Obtiene el BOM activo de un producto
 *
 * @param {string} idProducto - Producto
 * @param {string} idEmpresa - Empresa propietaria
 * @returns {Promise<BillOfMaterials|null>} BOM activo o null
 */
const obtenerBomActivo = async (idProducto, idEmpresa) => {
    return await BillOfMaterials.findOne({
        where: {
            idProducto,
            idEmpresa,
            esActiva: true,
            estado: 'aprobada',
            eliminado: false
        }
    });
};

module.exports = {
    obtenerCostoPromedioProducto,
    crearBom,
    agregarComponente,
    eliminarComponente,
    recalcularCostoBom,
    actualizarCostosConPreciosActuales,
    activarBom,
    obtenerBomCompleto,
    obtenerBomActivo
};