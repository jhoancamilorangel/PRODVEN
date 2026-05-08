const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

/**
 * Genera un código numérico aleatorio de 6 dígitos para verificación o 2FA
 * @returns {string} Código de 6 dígitos
 */
const generarCodigoVerificacion = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Genera un token aleatorio seguro para recuperación de contraseña o enlaces únicos
 * @param {number} bytes - Cantidad de bytes para el token (por defecto 32)
 * @returns {string} Token hexadecimal
 */
const generarTokenAleatorio = (bytes = 32) => {
    return crypto.randomBytes(bytes).toString('hex');
};

/**
 * Genera un UUID v4 único
 * @returns {string} UUID v4
 */
const generarUUID = () => {
    return uuidv4();
};

/**
 * Calcula la fecha de expiración a partir de minutos
 * @param {number} minutos - Cantidad de minutos hasta la expiración
 * @returns {Date} Fecha de expiración
 */
const calcularExpiracion = (minutos) => {
    const fecha = new Date();
    fecha.setMinutes(fecha.getMinutes() + minutos);
    return fecha;
};

/**
 * Verifica si una fecha ya expiró
 * @param {Date} fechaExpiracion - Fecha a verificar
 * @returns {boolean} true si ya expiró, false si aún es válida
 */
const haExpirado = (fechaExpiracion) => {
    if (!fechaExpiracion) return true;
    return new Date() > new Date(fechaExpiracion);
};

module.exports = {
    generarCodigoVerificacion,
    generarTokenAleatorio,
    generarUUID,
    calcularExpiracion,
    haExpirado
};