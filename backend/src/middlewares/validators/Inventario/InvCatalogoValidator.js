/**
 * Validadores de Categorías y Proveedores del Inventario Interno.
 * Sin dependencias externas: validación manual y clara.
 */
const { sendResponse } = require('../../../utils/response');

// ---------- CATEGORÍAS ----------
const validarCrearCategoria = (req, res, next) => {
    const errores = [];
    const { nombre, color } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        errores.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio.' });
    } else if (nombre.trim().length > 120) {
        errores.push({ campo: 'nombre', mensaje: 'El nombre no puede superar 120 caracteres.' });
    }
    if (req.body.descripcion && String(req.body.descripcion).length > 255) {
        errores.push({ campo: 'descripcion', mensaje: 'La descripción no puede superar 255 caracteres.' });
    }
    if (color && !/^#?[0-9A-Fa-f]{3,8}$/.test(String(color).trim())) {
        errores.push({ campo: 'color', mensaje: 'El color debe ser un valor hexadecimal válido.' });
    }

    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

const validarActualizarCategoria = (req, res, next) => {
    const errores = [];
    const { nombre, color } = req.body;

    if (nombre !== undefined) {
        if (typeof nombre !== 'string' || nombre.trim().length === 0) {
            errores.push({ campo: 'nombre', mensaje: 'El nombre no puede estar vacío.' });
        } else if (nombre.trim().length > 120) {
            errores.push({ campo: 'nombre', mensaje: 'El nombre no puede superar 120 caracteres.' });
        }
    }
    if (req.body.descripcion && String(req.body.descripcion).length > 255) {
        errores.push({ campo: 'descripcion', mensaje: 'La descripción no puede superar 255 caracteres.' });
    }
    if (color && !/^#?[0-9A-Fa-f]{3,8}$/.test(String(color).trim())) {
        errores.push({ campo: 'color', mensaje: 'El color debe ser un valor hexadecimal válido.' });
    }

    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

// ---------- PROVEEDORES ----------
const validarCrearProveedor = (req, res, next) => {
    const errores = [];
    const { nombre, correo, telefono } = req.body;

    if (!nombre || typeof nombre !== 'string' || nombre.trim().length === 0) {
        errores.push({ campo: 'nombre', mensaje: 'El nombre es obligatorio.' });
    } else if (nombre.trim().length > 200) {
        errores.push({ campo: 'nombre', mensaje: 'El nombre no puede superar 200 caracteres.' });
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo).trim())) {
        errores.push({ campo: 'correo', mensaje: 'El correo no tiene un formato válido.' });
    }
    if (telefono && String(telefono).trim().length > 30) {
        errores.push({ campo: 'telefono', mensaje: 'El teléfono no puede superar 30 caracteres.' });
    }

    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

const validarActualizarProveedor = (req, res, next) => {
    const errores = [];
    const { nombre, correo, telefono } = req.body;

    if (nombre !== undefined) {
        if (typeof nombre !== 'string' || nombre.trim().length === 0) {
            errores.push({ campo: 'nombre', mensaje: 'El nombre no puede estar vacío.' });
        } else if (nombre.trim().length > 200) {
            errores.push({ campo: 'nombre', mensaje: 'El nombre no puede superar 200 caracteres.' });
        }
    }
    if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(correo).trim())) {
        errores.push({ campo: 'correo', mensaje: 'El correo no tiene un formato válido.' });
    }
    if (telefono && String(telefono).trim().length > 30) {
        errores.push({ campo: 'telefono', mensaje: 'El teléfono no puede superar 30 caracteres.' });
    }

    if (errores.length > 0) return sendResponse(res, 400, false, 'Datos inválidos', { errores });
    next();
};

module.exports = {
    validarCrearCategoria,
    validarActualizarCategoria,
    validarCrearProveedor,
    validarActualizarProveedor
};