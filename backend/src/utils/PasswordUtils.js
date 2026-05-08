const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

/**
 * Genera un hash seguro de una contraseña usando bcrypt
 * @param {string} passwordPlano - La contraseña en texto plano
 * @returns {Promise<string>} El hash de la contraseña
 */
const hashearPassword = async (passwordPlano) => {
    if (!passwordPlano) {
        throw new Error('La contraseña no puede estar vacía');
    }
    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    return await bcrypt.hash(passwordPlano, salt);
};

/**
 * Compara una contraseña en texto plano con un hash almacenado
 * @param {string} passwordPlano - La contraseña ingresada por el usuario
 * @param {string} passwordHash - El hash almacenado en la base de datos
 * @returns {Promise<boolean>} true si coinciden, false si no
 */
const compararPassword = async (passwordPlano, passwordHash) => {
    if (!passwordPlano || !passwordHash) {
        return false;
    }
    return await bcrypt.compare(passwordPlano, passwordHash);
};

/**
 * Valida que una contraseña cumpla con los requisitos mínimos de seguridad
 * @param {string} password - La contraseña a validar
 * @returns {object} Objeto con el resultado de la validación
 */
const validarFortalezaPassword = (password) => {
    const errores = [];

    if (!password || password.length < 8) {
        errores.push('La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
        errores.push('La contraseña debe tener al menos una letra mayúscula');
    }
    if (!/[a-z]/.test(password)) {
        errores.push('La contraseña debe tener al menos una letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
        errores.push('La contraseña debe tener al menos un número');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errores.push('La contraseña debe tener al menos un carácter especial');
    }

    return {
        valida: errores.length === 0,
        errores
    };
};

module.exports = {
    hashearPassword,
    compararPassword,
    validarFortalezaPassword
};