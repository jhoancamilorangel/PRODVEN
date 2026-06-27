const { sendResponse } = require('../../../utils/response');

const validarCrearBodega = (req, res, next) => {
    const errores = [];
    const { nombre, codigo } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        errores.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio.' });
    } else if (nombre.trim().length > 150) {
        errores.push({ campo: 'nombre', mensaje: 'El nombre no puede superar 150 caracteres.' });
    }
    if (codigo && String(codigo).trim().length > 30) {
        errores.push({ campo: 'codigo', mensaje: 'El código no puede superar 30 caracteres.' });
    }
    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

const validarActualizarBodega = (req, res, next) => {
    const errores = [];
    const { nombre, codigo } = req.body;

    if (nombre !== undefined) {
        if (typeof nombre !== 'string' || nombre.trim().length === 0) {
            errores.push({ campo: 'nombre', mensaje: 'El nombre no puede estar vacío.' });
        } else if (nombre.trim().length > 150) {
            errores.push({ campo: 'nombre', mensaje: 'El nombre no puede superar 150 caracteres.' });
        }
    }
    if (codigo && String(codigo).trim().length > 30) {
        errores.push({ campo: 'codigo', mensaje: 'El código no puede superar 30 caracteres.' });
    }
    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

const validarTransferencia = (req, res, next) => {
    const errores = [];
    const { idArticulo, idBodegaOrigen, idBodegaDestino, cantidad } = req.body;

    if (!idArticulo) errores.push({ campo: 'idArticulo', mensaje: 'El artículo es obligatorio.' });
    if (!idBodegaOrigen) errores.push({ campo: 'idBodegaOrigen', mensaje: 'La bodega de origen es obligatoria.' });
    if (!idBodegaDestino) errores.push({ campo: 'idBodegaDestino', mensaje: 'La bodega de destino es obligatoria.' });
    if (idBodegaOrigen && idBodegaDestino && idBodegaOrigen === idBodegaDestino) {
        errores.push({ campo: 'idBodegaDestino', mensaje: 'Origen y destino no pueden ser la misma bodega.' });
    }
    if (cantidad === undefined || parseFloat(cantidad) <= 0) {
        errores.push({ campo: 'cantidad', mensaje: 'La cantidad debe ser mayor a cero.' });
    }
    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

module.exports = {
    validarCrearBodega,
    validarActualizarBodega,
    validarTransferencia
};