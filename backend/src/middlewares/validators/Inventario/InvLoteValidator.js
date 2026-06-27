const { sendResponse } = require('../../../utils/response');

const validarCrearLote = (req, res, next) => {
    const errores = [];
    const { idArticulo, idBodega, numeroLote, cantidad, fechaVencimiento, fechaFabricacion } = req.body;

    if (!idArticulo) errores.push({ campo: 'idArticulo', mensaje: 'El artículo es obligatorio.' });
    if (!idBodega) errores.push({ campo: 'idBodega', mensaje: 'La bodega es obligatoria.' });
    if (!numeroLote || typeof numeroLote !== 'string' || numeroLote.trim().length === 0) {
        errores.push({ campo: 'numeroLote', mensaje: 'El número de lote es obligatorio.' });
    } else if (numeroLote.trim().length > 80) {
        errores.push({ campo: 'numeroLote', mensaje: 'El número de lote no puede superar 80 caracteres.' });
    }
    if (cantidad !== undefined && cantidad !== '' && parseFloat(cantidad) < 0) {
        errores.push({ campo: 'cantidad', mensaje: 'La cantidad no puede ser negativa.' });
    }
    // Si vienen ambas fechas, la de vencimiento no puede ser anterior a la de fabricación
    if (fechaFabricacion && fechaVencimiento && new Date(fechaVencimiento) < new Date(fechaFabricacion)) {
        errores.push({ campo: 'fechaVencimiento', mensaje: 'El vencimiento no puede ser anterior a la fabricación.' });
    }

    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

const validarActualizarLote = (req, res, next) => {
    const errores = [];
    const { numeroLote, fechaVencimiento, fechaFabricacion } = req.body;

    if (numeroLote !== undefined) {
        if (typeof numeroLote !== 'string' || numeroLote.trim().length === 0) {
            errores.push({ campo: 'numeroLote', mensaje: 'El número de lote no puede estar vacío.' });
        } else if (numeroLote.trim().length > 80) {
            errores.push({ campo: 'numeroLote', mensaje: 'El número de lote no puede superar 80 caracteres.' });
        }
    }
    if (fechaFabricacion && fechaVencimiento && new Date(fechaVencimiento) < new Date(fechaFabricacion)) {
        errores.push({ campo: 'fechaVencimiento', mensaje: 'El vencimiento no puede ser anterior a la fabricación.' });
    }

    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

module.exports = {
    validarCrearLote,
    validarActualizarLote
};