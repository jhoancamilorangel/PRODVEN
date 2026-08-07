const Usuario = require('../models/Usuario');
const CodigoVerificacion = require('../models/CodigoVerificacion');
const authService = require('../services/shared/authService');
const emailService = require('../services/shared/emailService');
const twoFactorService = require('../services/shared/twoFactorService');
const { compararPassword, hashearPassword } = require('../utils/passwordUtils');
const { generarCodigoVerificacion, calcularExpiracion, haExpirado } = require('../utils/tokenUtils');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

const MAX_INTENTOS_FALLIDOS = 5;
const MINUTOS_BLOQUEO = 15;

// Roles que operan dentro de la app (no pueden usar la zona de marketplace/cliente)
const ROLES_INTERNOS = ['superadmin', 'administrador', 'vendedor', 'produccion', 'supervisor', 'domiciliario'];

/**
 * POST /api/auth/register
 * Registra un nuevo usuario y envía código de verificación al correo
 */
const registrar = async (req, res, next) => {
    let nuevoUsuario = null; // se guarda la referencia aquí para usarla en el catch
    try {
        const { nombres, apellidos, correo, password, telefono, rol } = req.body;

        const usuarioExistente = await Usuario.findOne({ where: { correo } });
        if (usuarioExistente) {
            return sendResponse(res, 409, false, 'Ya existe un usuario registrado con este correo');
        }

        nuevoUsuario = await Usuario.create({
            nombres,
            apellidos,
            correo,
            claveHash: password,
            telefono: telefono || null,
            rol: rol || 'cliente',
            verificado: false,
            activo: true
        });

        const { codigo } = await twoFactorService.generarCodigoVerificacionCorreo(nuevoUsuario);
        
        
        await emailService.enviarCorreoVerificacion(nuevoUsuario.correo, nuevoUsuario.nombres, codigo);

        logger.info(`Usuario registrado: ${nuevoUsuario.idUsuario} (${correo})`);

        return sendResponse(res, 201, true, 'Usuario registrado correctamente. Revisa tu correo para verificar tu cuenta.', {
            idUsuario: nuevoUsuario.idUsuario,
            correo: nuevoUsuario.correo
        });
    } catch (error) {
        logger.error(`Error en registro: ${error.message}`);
        
       
        if (nuevoUsuario) {
            try {
                await nuevoUsuario.destroy(); // Lo elimina de la base de datos (Sequelize)
                logger.info(`Se eliminó el usuario fantasma (${correo}) porque falló el envío del correo.`);
            } catch (bdError) {
                logger.error(`No se pudo limpiar el usuario fantasma de la BD: ${bdError.message}`);
            }
        }
        
        next(error);
    }
};

/**
 * POST /api/auth/verify-email
 * Verifica el correo del usuario con el código recibido
 */
const verificarCorreo = async (req, res, next) => {
    try {
        const { correo, codigo } = req.body;

        const usuario = await Usuario.findOne({ where: { correo } });
        if (!usuario) {
            return sendResponse(res, 404, false, 'Usuario no encontrado');
        }

        if (usuario.verificado) {
            return sendResponse(res, 400, false, 'La cuenta ya está verificada');
        }

        const resultado = await twoFactorService.validarCodigoVerificacionCorreo(usuario.idUsuario, codigo);
        if (!resultado.valido) {
            return sendResponse(res, 400, false, resultado.mensaje);
        }

        usuario.verificado = true;
        await usuario.save();

        logger.info(`Correo verificado: ${usuario.idUsuario}`);

        return sendResponse(res, 200, true, 'Correo verificado correctamente. Ya puedes iniciar sesión.');
    } catch (error) {
        logger.error(`Error en verificación de correo: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/auth/login
 * Inicia sesión, valida credenciales y maneja 2FA si está activo.
 * Si el login viene del marketplace (origen: 'marketplace') pero el usuario
 * tiene un rol interno, se bloquea con un mensaje explicativo.
 */
const login = async (req, res, next) => {
    try {
        const { correo, password, origen } = req.body;

        const usuario = await Usuario.findOne({ where: { correo } });
        if (!usuario) {
            return sendResponse(res, 401, false, 'Credenciales inválidas');
        }

        if (usuario.eliminado) {
            return sendResponse(res, 403, false, 'Esta cuenta fue eliminada');
        }

        if (!usuario.activo) {
            return sendResponse(res, 403, false, 'Esta cuenta está desactivada');
        }

        if (!usuario.verificado) {
            return sendResponse(res, 403, false, 'Debes verificar tu correo antes de iniciar sesión');
        }

        if (usuario.estaBloqueado()) {
            const minutosRestantes = Math.ceil((usuario.bloqueadoHasta - new Date()) / 60000);
            return sendResponse(res, 423, false, `Cuenta bloqueada. Intenta nuevamente en ${minutosRestantes} minutos`);
        }

        const passwordValida = await compararPassword(password, usuario.claveHash);

        if (!passwordValida) {
            usuario.intentosFallidos += 1;

            if (usuario.intentosFallidos >= MAX_INTENTOS_FALLIDOS) {
                usuario.bloqueadoHasta = calcularExpiracion(MINUTOS_BLOQUEO);
                usuario.intentosFallidos = 0;
                await usuario.save();
                logger.warn(`Cuenta bloqueada por intentos fallidos: ${usuario.idUsuario}`);
                return sendResponse(res, 423, false, `Demasiados intentos fallidos. Cuenta bloqueada por ${MINUTOS_BLOQUEO} minutos`);
            }

            await usuario.save();
            const intentosRestantes = MAX_INTENTOS_FALLIDOS - usuario.intentosFallidos;
            return sendResponse(res, 401, false, `Credenciales inválidas. Te quedan ${intentosRestantes} intentos`);
        }

        // Bloqueo de zona: un usuario interno no puede iniciar sesión en el marketplace.
        // La contraseña ya se validó, así que es seguro revelar este mensaje: es el dueño de la cuenta.
        if (origen === 'marketplace' && ROLES_INTERNOS.includes(usuario.rol)) {
            logger.info(`Usuario interno ${usuario.idUsuario} (${usuario.rol}) intentó entrar por el marketplace`);
            return sendResponse(res, 403, false, 'Esta cuenta es de uso interno de ProdVen (negocio). Para comprar en el marketplace, crea una cuenta nueva con otro correo.');
        }

        usuario.intentosFallidos = 0;
        usuario.bloqueadoHasta = null;
        await usuario.save();

        if (usuario.twoFactorActivo) {
            await twoFactorService.generarYEnviarCodigo2FA(usuario);
            logger.info(`Login con 2FA pendiente: ${usuario.idUsuario}`);
            return sendResponse(res, 200, true, 'Código 2FA enviado a tu correo', {
                requiere2FA: true,
                idUsuario: usuario.idUsuario
            });
        }

        const info = {
            ip: req.ip,
            dispositivo: req.headers['user-agent']
        };
        const tokens = await authService.generarParTokens(usuario, info);

        usuario.ultimoAcceso = new Date();
        await usuario.save();

        logger.info(`Login exitoso: ${usuario.idUsuario}`);

        return sendResponse(res, 200, true, 'Inicio de sesión exitoso', {
            usuario: {
                idUsuario: usuario.idUsuario,
                idEmpresa: usuario.idEmpresa,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                correo: usuario.correo,
                rol: usuario.rol
            },
            ...tokens
        });
    } catch (error) {
        logger.error(`Error en login: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/auth/2fa/verify
 * Valida el código 2FA y entrega los tokens si es correcto
 */
const verificar2FA = async (req, res, next) => {
    try {
        const { idUsuario, codigo } = req.body;

        const usuario = await Usuario.findByPk(idUsuario);
        if (!usuario) {
            return sendResponse(res, 404, false, 'Usuario no encontrado');
        }

        const resultado = await twoFactorService.validarCodigo2FA(idUsuario, codigo);
        if (!resultado.valido) {
            return sendResponse(res, 400, false, resultado.mensaje);
        }

        const info = {
            ip: req.ip,
            dispositivo: req.headers['user-agent']
        };
        const tokens = await authService.generarParTokens(usuario, info);

        usuario.ultimoAcceso = new Date();
        await usuario.save();

        logger.info(`Login con 2FA completado: ${usuario.idUsuario}`);

        return sendResponse(res, 200, true, 'Autenticación de dos factores exitosa', {
            usuario: {
                idUsuario: usuario.idUsuario,
                idEmpresa: usuario.idEmpresa,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                correo: usuario.correo,
                rol: usuario.rol
            },
            ...tokens
        });
    } catch (error) {
        logger.error(`Error en verificación 2FA: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/auth/refresh
 * Genera un nuevo access token a partir del refresh token
 */
const refrescarToken = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;

        const decoded = await authService.verificarRefreshToken(refreshToken);

        const usuario = await Usuario.findByPk(decoded.idUsuario);
        if (!usuario || usuario.eliminado || !usuario.activo) {
            return sendResponse(res, 401, false, 'Usuario no válido');
        }

        const nuevoAccessToken = authService.generarAccessToken(usuario);

        await authService.guardarToken({
            idUsuario: usuario.idUsuario,
            token: nuevoAccessToken,
            tipo: 'access',
            ipOrigen: req.ip,
            dispositivo: req.headers['user-agent'],
            minutosExpiracion: 15
        });

        logger.info(`Token refrescado: ${usuario.idUsuario}`);

        return sendResponse(res, 200, true, 'Token renovado correctamente', {
            accessToken: nuevoAccessToken
        });
    } catch (error) {
        logger.error(`Error al refrescar token: ${error.message}`);
        return sendResponse(res, 401, false, 'Refresh token inválido o expirado');
    }
};

/**
 * POST /api/auth/logout
 * Cierra la sesión revocando el access token actual y su refresh token asociado
 */
const logout = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        const { refreshToken } = req.body;

        if (token) {
            await authService.revocarToken(token);
        }

        if (refreshToken) {
            await authService.revocarToken(refreshToken);
        }

        logger.info(`Logout: ${req.userId}`);

        return sendResponse(res, 200, true, 'Sesión cerrada correctamente');
    } catch (error) {
         logger.error(`Error en logout: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/auth/logout-all
 * Cierra sesión en todos los dispositivos del usuario
 */
const logoutTodos = async (req, res, next) => {
    try {
        const cantidad = await authService.revocarTodosLosTokens(req.userId);
        logger.info(`Logout total: ${req.userId} (${cantidad} sesiones cerradas)`);

        return sendResponse(res, 200, true, `Se cerraron ${cantidad} sesiones`, { sesionesCerradas: cantidad });
    } catch (error) {
        logger.error(` Error en logout total: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/auth/forgot-password
 * Envía un código de recuperación al correo del usuario
 */
const solicitarRecuperacion = async (req, res, next) => {
    try {
        const { correo } = req.body;

        const usuario = await Usuario.findOne({ where: { correo } });

        if (usuario && !usuario.eliminado && usuario.activo) {
            const codigo = generarCodigoVerificacion();
            const fechaExpiracion = calcularExpiracion(30);

            await CodigoVerificacion.update(
                { usado: true },
                { where: { idUsuario: usuario.idUsuario, tipo: 'recuperacion_password', usado: false } }
            );

            await CodigoVerificacion.create({
                idUsuario: usuario.idUsuario,
                codigo,
                tipo: 'recuperacion_password',
                usado: false,
                intentos: 0,
                fechaExpiracion
            });

            await emailService.enviarCorreoRecuperacion(usuario.correo, usuario.nombres, codigo);
            logger.info(`Solicitud de recuperacion: ${usuario.idUsuario}`);
        }

        return sendResponse(res, 200, true, 'Si el correo existe en nuestra base de datos, recibirás un código de recuperación');
    } catch (error) {
        logger.error(`Error en solicitud de recuperación: ${error.message}`);
        next(error);
    }
};

/**
 * POST /api/auth/reset-password
 * Restablece la contraseña usando el código recibido por correo
 */
const restablecerPassword = async (req, res, next) => {
    try {
        const { correo, codigo, passwordNueva } = req.body;

        const usuario = await Usuario.findOne({ where: { correo } });
        if (!usuario) {
            return sendResponse(res, 404, false, 'Usuario no encontrado');
        }

        const registro = await CodigoVerificacion.findOne({
            where: {
                idUsuario: usuario.idUsuario,
                codigo,
                tipo: 'recuperacion_password',
                usado: false
            },
            order: [['fecha_creacion', 'DESC']]
        });

        if (!registro) {
            return sendResponse(res, 400, false, 'Código incorrecto');
        }

        if (!registro.esValido()) {
            await registro.incrementarIntento();
            return sendResponse(res, 400, false, 'Código expirado o intentos agotados');
        }

        // CORRECCIÓN: Hashear explícitamente y usar update directo
        // para evitar conflictos con los hooks del modelo Sequelize
        const passwordHasheada = await hashearPassword(passwordNueva);

        await Usuario.update(
            { claveHash: passwordHasheada },
            {
                where: { idUsuario: usuario.idUsuario },
                hooks: false
            }
        );

        registro.usado = true;
        await registro.save();

        await authService.revocarTodosLosTokens(usuario.idUsuario);

        logger.info(`Contraseña restablecida: ${usuario.idUsuario}`);

        return sendResponse(res, 200, true, 'Contraseña restablecida correctamente. Inicia sesión con tu nueva contraseña.');
    } catch (error) {
        logger.error(`Error al restablecer contraseña: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/auth/perfil
 * Devuelve los datos del usuario autenticado.
 */
const obtenerPerfil = async (req, res, next) => {
    try {
        const usuario = await Usuario.findOne({
            where: { idUsuario: req.userId, eliminado: false }
        });

        if (!usuario) {
            return sendResponse(res, 404, false, 'Usuario no encontrado');
        }

        return sendResponse(res, 200, true, 'Perfil obtenido', {
            usuario: {
                idUsuario: usuario.idUsuario,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                correo: usuario.correo,
                telefono: usuario.telefono,
                avatarUrl: usuario.avatarUrl,
                rol: usuario.rol,
                verificado: usuario.verificado
            }
        });
    } catch (error) {
        logger.error(`Error al obtener perfil: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/auth/perfil
 * Actualiza nombres, apellidos y teléfono del usuario autenticado.
 */
const actualizarPerfil = async (req, res, next) => {
    try {
        const usuario = await Usuario.findOne({
            where: { idUsuario: req.userId, eliminado: false }
        });

        if (!usuario) {
            return sendResponse(res, 404, false, 'Usuario no encontrado');
        }

        const { nombres, apellidos, telefono } = req.body;

        if (nombres !== undefined) usuario.nombres = nombres;
        if (apellidos !== undefined) usuario.apellidos = apellidos;
        if (telefono !== undefined) usuario.telefono = telefono;

        await usuario.save();

        return sendResponse(res, 200, true, 'Perfil actualizado', {
            usuario: {
                idUsuario: usuario.idUsuario,
                nombres: usuario.nombres,
                apellidos: usuario.apellidos,
                correo: usuario.correo,
                telefono: usuario.telefono,
                avatarUrl: usuario.avatarUrl,
                rol: usuario.rol,
                verificado: usuario.verificado
            }
        });
    } catch (error) {
        logger.error(`Error al actualizar perfil: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/auth/cambiar-password
 * Cambia la contraseña del usuario autenticado (valida la actual).
 */
const cambiarPassword = async (req, res, next) => {
    try {
        const usuario = await Usuario.findOne({
            where: { idUsuario: req.userId, eliminado: false }
        });

        if (!usuario) {
            return sendResponse(res, 404, false, 'Usuario no encontrado');
        }

        const { passwordActual, passwordNueva } = req.body;

        // Verificar la contraseña actual
        const coincide = await usuario.compararPassword(passwordActual);
        if (!coincide) {
            return sendResponse(res, 400, false, 'La contraseña actual es incorrecta');
        }

        // Asignar la nueva (el hook beforeUpdate del modelo la encripta sola)
        usuario.claveHash = passwordNueva;
        usuario.debeChangarPassword = false;
        await usuario.save();

        return sendResponse(res, 200, true, 'Contraseña actualizada correctamente');
    } catch (error) {
        logger.error(`Error al cambiar contraseña: ${error.message}`);
        next(error);
    }
};

module.exports = {
    registrar,
    verificarCorreo,
    login,
    verificar2FA,
    refrescarToken,
    logout,
    logoutTodos,
    solicitarRecuperacion,
    restablecerPassword,
    obtenerPerfil,
    actualizarPerfil,
    cambiarPassword
};