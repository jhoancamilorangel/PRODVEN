const ZonaCobertura = require('../../models/ZonaCobertura');
const logger = require('../../config/logger');

/**
 * Servicio de Zonas de Cobertura
 *
 * Maneja las áreas geográficas donde una empresa entrega:
 *  - Crear y gestionar zonas (por ahora tipo círculo)
 *  - Validar si una dirección (lat/long) tiene cobertura
 *  - Determinar el costo y tiempo de entrega según la zona
 *
 * Una empresa puede tener varias zonas. Una dirección puede caer en más
 * de una; en ese caso se elige la de menor costo adicional.
 */

// =====================================================
// GESTIÓN DE ZONAS
// =====================================================

/**
 * Crea una zona de cobertura tipo círculo
 */
const crearZona = async (idEmpresa, datos) => {
    // Validar según el tipo
    if (datos.tipo === 'circulo' || !datos.tipo) {
        if (datos.latitudCentro === undefined || datos.longitudCentro === undefined || datos.radioKm === undefined) {
            return {
                exito: false,
                mensaje: 'Una zona circular requiere latitudCentro, longitudCentro y radioKm'
            };
        }

        if (parseFloat(datos.radioKm) <= 0) {
            return { exito: false, mensaje: 'El radio debe ser mayor a cero' };
        }
    }

    const zona = await ZonaCobertura.create({
        idEmpresa,
        nombre: datos.nombre,
        tipo: datos.tipo || 'circulo',
        latitudCentro: datos.latitudCentro,
        longitudCentro: datos.longitudCentro,
        radioKm: datos.radioKm,
        costoAdicional: datos.costoAdicional !== undefined ? datos.costoAdicional : 0,
        tiempoEstimadoMin: datos.tiempoEstimadoMin !== undefined ? datos.tiempoEstimadoMin : 30,
        activo: true
    });

    logger.info(`Zona de cobertura creada: ${zona.idZona} para empresa ${idEmpresa}`);

    return { exito: true, zona: zona.datosCompletos(), mensaje: 'Zona de cobertura creada' };
};

/**
 * Lista las zonas de cobertura de una empresa
 */
const listarZonas = async (idEmpresa) => {
    const zonas = await ZonaCobertura.findAll({
        where: { idEmpresa, activo: true },
        order: [['fecha_creacion', 'DESC']]
    });

    return zonas.map(z => z.datosCompletos());
};

/**
 * Obtiene una zona específica
 */
const obtenerZona = async (idZona, idEmpresa) => {
    const zona = await ZonaCobertura.findOne({
        where: { idZona, idEmpresa }
    });

    return zona ? zona.datosCompletos() : null;
};

/**
 * Actualiza una zona de cobertura
 */
const actualizarZona = async (idZona, idEmpresa, datos) => {
    const zona = await ZonaCobertura.findOne({
        where: { idZona, idEmpresa }
    });

    if (!zona) {
        return { exito: false, mensaje: 'Zona no encontrada' };
    }

    const camposActualizables = ['nombre', 'latitudCentro', 'longitudCentro', 'radioKm', 'costoAdicional', 'tiempoEstimadoMin', 'activo'];
    for (const campo of camposActualizables) {
        if (datos[campo] !== undefined) {
            zona[campo] = datos[campo];
        }
    }

    await zona.save();

    return { exito: true, zona: zona.datosCompletos(), mensaje: 'Zona actualizada' };
};

/**
 * Desactiva (elimina lógicamente) una zona
 */
const desactivarZona = async (idZona, idEmpresa) => {
    const zona = await ZonaCobertura.findOne({
        where: { idZona, idEmpresa }
    });

    if (!zona) {
        return { exito: false, mensaje: 'Zona no encontrada' };
    }

    zona.activo = false;
    await zona.save();

    return { exito: true, mensaje: 'Zona desactivada' };
};

// =====================================================
// VALIDACIÓN DE COBERTURA
// =====================================================

/**
 * Verifica si una dirección (lat/long) tiene cobertura en alguna zona de la empresa
 *
 * Si cae en varias zonas, elige la de menor costo adicional.
 *
 * @param {string} idEmpresa - Empresa
 * @param {number} latitud - Latitud de la dirección del cliente
 * @param {number} longitud - Longitud de la dirección del cliente
 * @returns {Promise<object>} { tieneCobertura, zona, costoAdicional, tiempoEstimado }
 */
const validarCobertura = async (idEmpresa, latitud, longitud) => {
    const zonas = await ZonaCobertura.findAll({
        where: { idEmpresa, activo: true }
    });

    if (zonas.length === 0) {
        return {
            tieneCobertura: false,
            mensaje: 'La empresa no tiene zonas de cobertura definidas',
            sinZonasDefinidas: true
        };
    }

    // Buscar todas las zonas que contienen el punto
    const zonasQueCubren = [];
    for (const zona of zonas) {
        if (zona.contienePunto(latitud, longitud)) {
            zonasQueCubren.push(zona);
        }
    }

    if (zonasQueCubren.length === 0) {
        return {
            tieneCobertura: false,
            mensaje: 'La dirección está fuera de las zonas de cobertura'
        };
    }

    // Si cae en varias, elegir la de menor costo adicional
    zonasQueCubren.sort((a, b) => parseFloat(a.costoAdicional) - parseFloat(b.costoAdicional));
    const mejorZona = zonasQueCubren[0];

    return {
        tieneCobertura: true,
        zona: mejorZona.datosCompletos(),
        costoAdicional: parseFloat(mejorZona.costoAdicional),
        tiempoEstimado: mejorZona.tiempoEstimadoMin,
        mensaje: `Cobertura disponible en zona "${mejorZona.nombre}"`
    };
};

module.exports = {
    crearZona,
    listarZonas,
    obtenerZona,
    actualizarZona,
    desactivarZona,
    validarCobertura
};