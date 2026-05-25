const cloudinary = require('../../config/cloudinary');
const logger = require('../../config/logger');
const streamifier = require('streamifier');

/**
 * Servicio de Cloudinary
 *
 * Centraliza la subida, transformación y eliminación de imágenes.
 * Genera automáticamente tres tamaños por cada imagen subida:
 *   - thumbnail (200px): listados, carrito, resultados de búsqueda
 *   - medio (600px): tarjetas del catálogo
 *   - original (1200px): vista de detalle del producto
 *
 * Todas las imágenes se optimizan con calidad automática y formato WebP
 * cuando el navegador lo soporta, para máximo rendimiento.
 */

/**
 * Configuración de los tres tamaños que generamos
 */
const TRANSFORMACIONES = {
    thumbnail: { width: 200, height: 200, crop: 'fill', quality: 'auto', fetch_format: 'auto' },
    medio: { width: 600, height: 600, crop: 'limit', quality: 'auto', fetch_format: 'auto' },
    original: { width: 1200, height: 1200, crop: 'limit', quality: 'auto', fetch_format: 'auto' }
};

/**
 * Sube un buffer de imagen a Cloudinary y genera las tres versiones
 *
 * @param {Buffer} buffer - Buffer de la imagen (viene de Multer en memoria)
 * @param {object} opciones - { carpeta, nombreBase }
 * @returns {Promise<object>} Datos de la imagen subida con las tres URLs
 */
const subirImagen = async (buffer, opciones = {}) => {
    const { carpeta = 'prodven/general', nombreBase = null } = opciones;

    return new Promise((resolve, reject) => {
        const configSubida = {
            folder: carpeta,
            resource_type: 'image',
            transformation: [TRANSFORMACIONES.original],
            eager: [
                TRANSFORMACIONES.thumbnail,
                TRANSFORMACIONES.medio
            ],
            eager_async: false
        };

        if (nombreBase) {
            configSubida.public_id = nombreBase;
        }

        const uploadStream = cloudinary.uploader.upload_stream(
            configSubida,
            (error, resultado) => {
                if (error) {
                    logger.error(`Error al subir imagen a Cloudinary: ${error.message}`);
                    return reject(new Error('No se pudo subir la imagen'));
                }

                const urlThumbnail = resultado.eager && resultado.eager[0]
                    ? resultado.eager[0].secure_url
                    : resultado.secure_url;

                const urlMedio = resultado.eager && resultado.eager[1]
                    ? resultado.eager[1].secure_url
                    : resultado.secure_url;

                logger.info(`Imagen subida a Cloudinary: ${resultado.public_id}`);

                resolve({
                    publicId: resultado.public_id,
                    urlOriginal: resultado.secure_url,
                    urlMedio,
                    urlThumbnail,
                    formato: resultado.format,
                    tamanoBytes: resultado.bytes,
                    ancho: resultado.width,
                    alto: resultado.height
                });
            }
        );

        streamifier.createReadStream(buffer).pipe(uploadStream);
    });
};

/**
 * Sube una imagen específica para un producto
 * Organiza la imagen en la carpeta de la empresa correspondiente
 *
 * @param {Buffer} buffer - Buffer de la imagen
 * @param {string} idEmpresa - Para organizar en carpetas
 * @param {string} idProducto - Para nombrar la imagen
 * @returns {Promise<object>} Datos de la imagen subida
 */
const subirImagenProducto = async (buffer, idEmpresa, idProducto) => {
    const carpeta = `prodven/${idEmpresa}/productos/${idProducto}`;
    return await subirImagen(buffer, { carpeta });
};

/**
 * Sube el logo o portada de una empresa
 *
 * @param {Buffer} buffer - Buffer de la imagen
 * @param {string} idEmpresa - Para organizar y nombrar
 * @param {string} tipo - 'logo' o 'portada'
 * @returns {Promise<object>} Datos de la imagen subida
 */
const subirImagenEmpresa = async (buffer, idEmpresa, tipo = 'logo') => {
    const carpeta = `prodven/${idEmpresa}/marca`;
    const nombreBase = `${carpeta}/${tipo}`;
    return await subirImagen(buffer, { carpeta, nombreBase });
};

/**
 * Elimina una imagen de Cloudinary usando su public_id
 *
 * @param {string} publicId - ID de la imagen en Cloudinary
 * @returns {Promise<boolean>} true si se eliminó correctamente
 */
const eliminarImagen = async (publicId) => {
    if (!publicId) {
        logger.warn('Intento de eliminar imagen sin publicId');
        return false;
    }

    try {
        const resultado = await cloudinary.uploader.destroy(publicId);

        if (resultado.result === 'ok' || resultado.result === 'not found') {
            logger.info(`Imagen eliminada de Cloudinary: ${publicId}`);
            return true;
        }

        logger.warn(`Resultado inesperado al eliminar imagen ${publicId}: ${resultado.result}`);
        return false;
    } catch (error) {
        logger.error(`Error al eliminar imagen de Cloudinary: ${error.message}`);
        return false;
    }
};

/**
 * Elimina múltiples imágenes de Cloudinary
 *
 * @param {string[]} publicIds - Array de public_ids a eliminar
 * @returns {Promise<object>} { eliminadas, fallidas }
 */
const eliminarMultiplesImagenes = async (publicIds = []) => {
    if (!Array.isArray(publicIds) || publicIds.length === 0) {
        return { eliminadas: 0, fallidas: 0 };
    }

    let eliminadas = 0;
    let fallidas = 0;

    for (const publicId of publicIds) {
        const exito = await eliminarImagen(publicId);
        if (exito) {
            eliminadas += 1;
        } else {
            fallidas += 1;
        }
    }

    logger.info(`Eliminación múltiple: ${eliminadas} eliminadas, ${fallidas} fallidas`);
    return { eliminadas, fallidas };
};

/**
 * Elimina una carpeta completa de Cloudinary
 * Útil al eliminar un producto o empresa con todas sus imágenes
 *
 * @param {string} carpeta - Ruta de la carpeta a eliminar
 * @returns {Promise<boolean>} true si se eliminó
 */
const eliminarCarpeta = async (carpeta) => {
    if (!carpeta) return false;

    try {
        await cloudinary.api.delete_resources_by_prefix(carpeta);
        await cloudinary.api.delete_folder(carpeta);
        logger.info(`Carpeta eliminada de Cloudinary: ${carpeta}`);
        return true;
    } catch (error) {
        logger.error(`Error al eliminar carpeta ${carpeta}: ${error.message}`);
        return false;
    }
};

/**
 * Verifica la conexión con Cloudinary al iniciar el servidor
 *
 * @returns {Promise<boolean>} true si la conexión funciona
 */
const verificarConexion = async () => {
    try {
        await cloudinary.api.ping();
        logger.info('Servicio de Cloudinary conectado correctamente');
        return true;
    } catch (error) {
        logger.error(`Error al conectar Cloudinary: ${error.message}`);
        return false;
    }
};

module.exports = {
    subirImagen,
    subirImagenProducto,
    subirImagenEmpresa,
    eliminarImagen,
    eliminarMultiplesImagenes,
    eliminarCarpeta,
    verificarConexion
};