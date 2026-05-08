const CodigoVerificacion = require('../../models/CodigoVerificacion');
const { generarCodigoVerificacion, calcularExpiracion } = require('../../utils/tokenUtils');
const { enviarCodigo2FA } = require('./emailService');
const logger = require('../../config/logger');

/**
 * Genera y envía un código 2FA al correo del usuario
 * @param {object} usuario - Usuario que necesita verificar 2FA
 * @returns {Promise<object>} Registro del código creado
 */
const generarYEnviarCodigo2FA = async (usuario) => {
    await CodigoVerificacion.update(
        { usado: true },
        { where: { idUsuario: usuario.idUsuario, tipo: '2fa', usado: false } }
    );

    const codigo = generarCodigoVerificacion();
    const fechaExpiracion = calcularExpiracion(5);

    const registro = await CodigoVerificacion.create({
        idUsuario: usuario.idUsuario,
        codigo,
        tipo: '2fa',
        usado: false,
        intentos: 0,
        fechaExpiracion
    });

    await enviarCodigo2FA(usuario.correo, usuario.nombres, codigo);

    logger.info(`Código 2FA generado para usuario ${usuario.idUsuario}`);
    return registro;
};

/**
 * Valida un código 2FA ingresado por el usuario
 * @param {string} idUsuario - ID del usuario
 * @param {string} codigoIngresado - Código que envió el usuario
 * @returns {Promise<object>} Resultado de la validación
 */
const validarCodigo2FA = async (idUsuario, codigoIngresado) => {
    const registro = await CodigoVerificacion.findOne({
        where: {
            idUsuario,
            codigo: codigoIngresado,
            tipo: '2fa',
            usado: false
        },
        order: [['fecha_creacion', 'DESC']]
    });

    if (!registro) {
        return { valido: false, mensaje: 'Código incorrecto' };
    }

    if (!registro.esValido()) {
        await registro.incrementarIntento();
        return { valido: false, mensaje: 'Código expirado o intentos agotados' };
    }

    registro.usado = true;
    await registro.save();

    return { valido: true, mensaje: 'Código válido' };
};

/**
 * Genera y envía un código de verificación de correo (al registrarse)
 * @param {object} usuario - Usuario recién registrado
 * @returns {Promise<object>} Registro del código creado
 */
const generarCodigoVerificacionCorreo = async (usuario) => {
    const codigo = generarCodigoVerificacion();
    const fechaExpiracion = calcularExpiracion(15);

    const registro = await CodigoVerificacion.create({
        idUsuario: usuario.idUsuario,
        codigo,
        tipo: 'verificacion_correo',
        usado: false,
        intentos: 0,
        fechaExpiracion
    });

    logger.info(`Código de verificación generado para usuario ${usuario.idUsuario}`);
    return { registro, codigo };
};

/**
 * Valida un código de verificación de correo
 * @param {string} idUsuario - ID del usuario
 * @param {string} codigoIngresado - Código ingresado
 * @returns {Promise<object>} Resultado de la validación
 */
const validarCodigoVerificacionCorreo = async (idUsuario, codigoIngresado) => {
    const registro = await CodigoVerificacion.findOne({
        where: {
            idUsuario,
            codigo: codigoIngresado,
            tipo: 'verificacion_correo',
            usado: false
        },
        order: [['fecha_creacion', 'DESC']]
    });

    if (!registro) {
        return { valido: false, mensaje: 'Código incorrecto' };
    }

    if (!registro.esValido()) {
        await registro.incrementarIntento();
        return { valido: false, mensaje: 'Código expirado o intentos agotados' };
    }

    registro.usado = true;
    await registro.save();

    return { valido: true, mensaje: 'Correo verificado correctamente' };
};

module.exports = {
    generarYEnviarCodigo2FA,
    validarCodigo2FA,
    generarCodigoVerificacionCorreo,
    validarCodigoVerificacionCorreo
};