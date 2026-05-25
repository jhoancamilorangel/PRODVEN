const ImagenProducto = require('../models/ImagenProducto');
const Producto = require('../models/Producto');
const cloudinaryService = require('../services/private/cloudinaryService');
const { construirFiltroTenant } = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * POST /api/productos/:id/imagenes
 * Sube una imagen a un producto (Solo Admin)
 * La imagen llega en req.file gracias a Multer
 */
const subirImagen = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const totalImagenes = await ImagenProducto.count({
            where: { idProducto: producto.idProducto, eliminado: false }
        });

        if (totalImagenes >= 10) {
            return sendResponse(res, 409, false, 'El producto ya tiene el máximo de 10 imágenes');
        }

        const resultadoUpload = await cloudinaryService.subirImagenProducto(
            req.file.buffer,
            req.tenantId,
            producto.idProducto
        );

        const esPrimera = totalImagenes === 0;

        const imagen = await ImagenProducto.create({
            idProducto: producto.idProducto,
            idEmpresa: req.tenantId,
            urlOriginal: resultadoUpload.urlOriginal,
            urlMedio: resultadoUpload.urlMedio,
            urlThumbnail: resultadoUpload.urlThumbnail,
            publicId: resultadoUpload.publicId,
            nombreArchivo: req.file.originalname,
            formato: resultadoUpload.formato,
            tamanoBytes: resultadoUpload.tamanoBytes,
            ancho: resultadoUpload.ancho,
            alto: resultadoUpload.alto,
            textoAlternativo: req.body.textoAlternativo || producto.nombre,
            esPrincipal: esPrimera,
            ordenVisualizacion: totalImagenes
        });

        logger.info(`Imagen subida al producto ${producto.idProducto}: ${imagen.idImagen}`);

        return sendResponse(res, 201, true, 'Imagen subida correctamente', imagen.datosPublicos());
    } catch (error) {
        logger.error(`Error al subir imagen: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/productos/:id/imagenes
 * Lista las imágenes de un producto
 */
const listarImagenes = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const imagenes = await ImagenProducto.findAll({
            where: { idProducto: producto.idProducto, eliminado: false },
            order: [['orden_visualizacion', 'ASC']]
        });

        return sendResponse(res, 200, true, 'Imágenes obtenidas', {
            imagenes: imagenes.map(img => img.datosPublicos())
        });
    } catch (error) {
        logger.error(`Error al listar imágenes: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/productos/:id/imagenes/:imagenId
 * Elimina una imagen del producto y de Cloudinary (Solo Admin)
 */
const eliminarImagen = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const imagen = await ImagenProducto.findOne({
            where: {
                idImagen: req.params.imagenId,
                idProducto: producto.idProducto,
                eliminado: false
            }
        });

        if (!imagen) {
            return sendResponse(res, 404, false, 'Imagen no encontrada');
        }

        await cloudinaryService.eliminarImagen(imagen.publicId);

        const eraPrincipal = imagen.esPrincipal;

        imagen.eliminado = true;
        imagen.activo = false;
        await imagen.save();

        if (eraPrincipal) {
            const otraImagen = await ImagenProducto.findOne({
                where: { idProducto: producto.idProducto, eliminado: false },
                order: [['orden_visualizacion', 'ASC']]
            });

            if (otraImagen) {
                otraImagen.esPrincipal = true;
                await otraImagen.save();
            }
        }

        logger.info(`Imagen eliminada: ${imagen.idImagen} del producto ${producto.idProducto}`);

        return sendResponse(res, 200, true, 'Imagen eliminada correctamente');
    } catch (error) {
        logger.error(`Error al eliminar imagen: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/productos/:id/imagenes/:imagenId/principal
 * Marca una imagen como principal del producto (Solo Admin)
 */
const marcarPrincipal = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const imagen = await ImagenProducto.findOne({
            where: {
                idImagen: req.params.imagenId,
                idProducto: producto.idProducto,
                eliminado: false
            }
        });

        if (!imagen) {
            return sendResponse(res, 404, false, 'Imagen no encontrada');
        }

        await ImagenProducto.update(
            { esPrincipal: false },
            { where: { idProducto: producto.idProducto } }
        );

        imagen.esPrincipal = true;
        await imagen.save();

        logger.info(`Imagen ${imagen.idImagen} marcada como principal`);

        return sendResponse(res, 200, true, 'Imagen marcada como principal');
    } catch (error) {
        logger.error(`Error al marcar imagen principal: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/productos/:id/imagenes/ordenar
 * Reordena las imágenes de la galería (Solo Admin)
 */
const ordenarImagenes = async (req, res, next) => {
    try {
        const filtros = construirFiltroTenant(req, {
            idProducto: req.params.id,
            eliminado: false
        });

        const producto = await Producto.findOne({ where: filtros });

        if (!producto) {
            return sendResponse(res, 404, false, 'Producto no encontrado');
        }

        const { orden } = req.body;

        for (const item of orden) {
            await ImagenProducto.update(
                { ordenVisualizacion: item.ordenVisualizacion },
                {
                    where: {
                        idImagen: item.idImagen,
                        idProducto: producto.idProducto
                    }
                }
            );
        }

        logger.info(`Imágenes reordenadas para producto ${producto.idProducto}`);

        return sendResponse(res, 200, true, 'Orden de imágenes actualizado');
    } catch (error) {
        logger.error(`Error al ordenar imágenes: ${error.message}`);
        next(error);
    }
};

module.exports = {
    subirImagen,
    listarImagenes,
    eliminarImagen,
    marcarPrincipal,
    ordenarImagenes
};