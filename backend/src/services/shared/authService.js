const jwt = require('jsonwebtoken');
const TokenAcceso = require('../../models/TokenAcceso');
const { calcularExpiracion } = require('../../utils/tokenUtils');
const logger = require('../../config/logger');

/**
 * Genera un Access Token JWT con los datos del usuario
 * @param {object} usuario - Objeto usuario con idUsuario, idEmpresa, rol
 * @returns {string} JWT firmado
 */
const generarAccessToken = (usuario) => {
    const payload = {
        idUsuario: usuario.idUsuario,
        idEmpresa: usuario.idEmpresa,
        correo: usuario.correo,
        rol: usuario.rol
    };

    return jwt.sign(payload, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m'
    });
};

/**
 * Genera un Refresh Token JWT de larga duración
 * @param {object} usuario - Objeto usuario con idUsuario
 * @returns {string} Refresh Token firmado
 */
const generarRefreshToken = (usuario) => {
    const payload = {
        idUsuario: usuario.idUsuario,
        tipo: 'refresh'
    };

    return jwt.sign(payload, process.env.REFRESH_TOKEN_SECRET, {
        expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || '7d'
    });
};

/**
 * Verifica y decodifica un Access Token
 * @param {string} token - Token JWT a verificar
 * @returns {object} Payload decodificado
 */
const verificarAccessToken = (token) => {
    try {
        return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
        logger.warn(`Token de acceso inválido: ${error.message}`);
        throw new Error('Token de acceso inválido o expirado');
    }
};

/**
 * Verifica y decodifica un Refresh Token.
 * Valida la firma JWT Y confirma en base de datos que el token
 * siga activo (no haya sido revocado por logout / logout-all).
 * Esto evita que un refresh token robado o filtrado siga funcionando
 * después de que el usuario cerró sesión.
 * @param {string} token - Refresh Token a verificar
 * @returns {Promise<object>} Payload decodificado
 */
const verificarRefreshToken = async (token) => {
    let decoded;
    try {
        decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
    } catch (error) {
        logger.warn(`Refresh token inválido: ${error.message}`);
        throw new Error('Refresh token inválido o expirado');
    }

    const tokenDb = await TokenAcceso.findOne({
        where: { token, tipo: 'refresh', activo: true }
    });

    if (!tokenDb) {
        logger.warn(`Refresh token revocado o no encontrado: idUsuario ${decoded.idUsuario}`);
        throw new Error('Refresh token inválido o expirado');
    }

    if (tokenDb.fechaExpiracion && new Date(tokenDb.fechaExpiracion) < new Date()) {
        logger.warn(`Refresh token expirado en BD: idUsuario ${decoded.idUsuario}`);
        throw new Error('Refresh token inválido o expirado');
    }

    return decoded;
};

/**
 * Guarda un token en la base de datos para poder rastrearlo y revocarlo
 * @param {object} datos - Datos del token a guardar
 * @returns {Promise<TokenAcceso>} Registro creado
 */
const guardarToken = async ({ idUsuario, token, tipo, ipOrigen, dispositivo, minutosExpiracion }) => {
    return await TokenAcceso.create({
        idUsuario,
        token,
        tipo,
        ipOrigen,
        dispositivo,
        activo: true,
        fechaExpiracion: calcularExpiracion(minutosExpiracion)
    });
};

/**
 * Genera el par completo de tokens (access + refresh) y los guarda
 * @param {object} usuario - Usuario autenticado
 * @param {object} info - Información de la petición (IP, dispositivo)
 * @returns {Promise<object>} Objeto con accessToken y refreshToken
 */
const generarParTokens = async (usuario, info = {}) => {
    const accessToken = generarAccessToken(usuario);
    const refreshToken = generarRefreshToken(usuario);

    await guardarToken({
        idUsuario: usuario.idUsuario,
        token: accessToken,
        tipo: 'access',
        ipOrigen: info.ip,
        dispositivo: info.dispositivo,
        minutosExpiracion: 15
    });

    await guardarToken({
        idUsuario: usuario.idUsuario,
        token: refreshToken,
        tipo: 'refresh',
        ipOrigen: info.ip,
        dispositivo: info.dispositivo,
        minutosExpiracion: 60 * 24 * 7
    });

    return { accessToken, refreshToken };
};

/**
 * Revoca un token específico
 * @param {string} token - Token a revocar
 * @returns {Promise<boolean>} true si se revocó, false si no existía
 */
const revocarToken = async (token) => {
    const tokenDb = await TokenAcceso.findOne({ where: { token } });
    if (!tokenDb) return false;

    tokenDb.activo = false;
    await tokenDb.save();
    return true;
};

/**
 * Revoca todos los tokens activos de un usuario (logout en todos los dispositivos)
 * @param {string} idUsuario - ID del usuario
 * @returns {Promise<number>} Cantidad de tokens revocados
 */
const revocarTodosLosTokens = async (idUsuario) => {
    const [cantidad] = await TokenAcceso.update(
        { activo: false },
        { where: { idUsuario, activo: true } }
    );
    return cantidad;
};

module.exports = {
    generarAccessToken,
    generarRefreshToken,
    verificarAccessToken,
    verificarRefreshToken,
    guardarToken,
    generarParTokens,
    revocarToken,
    revocarTodosLosTokens
};