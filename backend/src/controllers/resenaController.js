const resenaService = require('../services/private/resenaService');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const resolverEmpresa = (req) => {
    const bodyEmpresa = req.body ? req.body.idEmpresa : null;
    const queryEmpresa = req.query ? req.query.idEmpresa : null;
    return bodyEmpresa || queryEmpresa || req.tenantId || null;
};

/**
 * POST /api/resenas
 * Crea una reseña (el cliente autenticado)
 */
const crearResena = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        // El cliente es el usuario autenticado
        const resultado = await resenaService.crearResena(idEmpresa, req.userId, {
            idProducto: req.body.idProducto,
            calificacion: req.body.calificacion,
            titulo: req.body.titulo,
            comentario: req.body.comentario
        });

        if (!resultado.exito) {
            const status = resultado.yaResenado ? 409 : 403;
            return sendResponse(res, status, false, resultado.mensaje);
        }

        return sendResponse(res, 201, true, resultado.mensaje, resultado.resena);
    } catch (error) {
        logger.error(`Error al crear reseña: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/resenas/producto/:idProducto
 * Lista las reseñas visibles de un producto (público para clientes)
 */
const listarResenasProducto = async (req, res, next) => {
    try {
        const resultado = await resenaService.listarResenasProducto(
            req.params.idProducto,
            { pagina: req.query.pagina, limit: req.query.limit }
        );

        return sendResponse(res, 200, true, 'Reseñas obtenidas', resultado);
    } catch (error) {
        logger.error(`Error al listar reseñas: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/resenas/mis-resenas
 * Lista las reseñas del cliente autenticado
 */
const listarMisResenas = async (req, res, next) => {
    try {
        const resultado = await resenaService.listarResenasCliente(req.userId);

        return sendResponse(res, 200, true, 'Tus reseñas', resultado);
    } catch (error) {
        logger.error(`Error al listar mis reseñas: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/resenas/:idResena
 * Edita la propia reseña
 */
const editarResena = async (req, res, next) => {
    try {
        const resultado = await resenaService.editarResena(req.params.idResena, req.userId, {
            calificacion: req.body.calificacion,
            titulo: req.body.titulo,
            comentario: req.body.comentario
        });

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje, resultado.resena);
    } catch (error) {
        logger.error(`Error al editar reseña: ${error.message}`);
        next(error);
    }
};

/**
 * DELETE /api/resenas/:idResena
 * Elimina la propia reseña
 */
const eliminarResena = async (req, res, next) => {
    try {
        const resultado = await resenaService.eliminarResena(req.params.idResena, req.userId);

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al eliminar reseña: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/resenas/:idResena/visibilidad
 * La empresa modera una reseña (la oculta o muestra)
 */
const cambiarVisibilidad = async (req, res, next) => {
    try {
        const idEmpresa = resolverEmpresa(req);

        if (!idEmpresa) {
            return sendResponse(res, 400, false, 'Debes indicar la empresa (idEmpresa)');
        }

        if (req.body.visible === undefined) {
            return sendResponse(res, 400, false, 'Debes indicar el valor de visible (true o false)');
        }

        const resultado = await resenaService.cambiarVisibilidad(
            req.params.idResena,
            idEmpresa,
            req.body.visible
        );

        if (!resultado.exito) {
            return sendResponse(res, 404, false, resultado.mensaje);
        }

        return sendResponse(res, 200, true, resultado.mensaje);
    } catch (error) {
        logger.error(`Error al cambiar visibilidad: ${error.message}`);
        next(error);
    }
};

module.exports = {
    crearResena,
    listarResenasProducto,
    listarMisResenas,
    editarResena,
    eliminarResena,
    cambiarVisibilidad
};