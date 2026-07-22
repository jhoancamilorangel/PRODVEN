const { Server } = require('socket.io');
const authService = require('../services/shared/authService');
const Usuario = require('../models/Usuario');
const TokenAcceso = require('../models/TokenAcceso');
const ParticipanteConversacion = require('../models/ParticipanteConversacion');
const logger = require('./logger');

let io = null;

/**
 * Inicializa Socket.io sobre el servidor HTTP existente. Se llama una
 * sola vez desde server.js, después de crear el servidor HTTP y antes
 * de que empiece a escuchar.
 *
 * Salas usadas:
 * - usuario:<idUsuario>: sala personal, para notificaciones dirigidas
 *   solo a ese usuario (independiente de qué chat tenga abierto).
 * - conversacion:<idConversacion>: sala de una conversación específica,
 *   a la que el cliente se une manualmente al abrir ese chat.
 */
const inicializarSocket = (httpServer) => {
    io = new Server(httpServer, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        }
    });

    // Autenticación del socket: se ejecuta una sola vez, al conectar.
    // Reutiliza la misma verificación de JWT que verificarAutenticacion
    // (middleware HTTP), pero adaptada al ciclo de vida de un socket.
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token;
            if (!token) {
                return next(new Error('SIN_TOKEN'));
            }

            const tokenDb = await TokenAcceso.findOne({
                where: { token, tipo: 'access', activo: true }
            });
            if (!tokenDb || !tokenDb.estaVigente()) {
                return next(new Error('TOKEN_INVALIDO'));
            }

            const decoded = authService.verificarAccessToken(token);
            const usuario = await Usuario.findByPk(decoded.idUsuario);
            if (!usuario || usuario.eliminado || !usuario.activo) {
                return next(new Error('USUARIO_INVALIDO'));
            }

            socket.idUsuario = usuario.idUsuario;
            next();
        } catch (error) {
            next(new Error('TOKEN_INVALIDO'));
        }
    });

    io.on('connection', (socket) => {
        socket.join(`usuario:${socket.idUsuario}`);
        logger.info(`Socket conectado: usuario ${socket.idUsuario} (${socket.id})`);

        // El cliente pide unirse a la sala de una conversación al abrir
        // ese chat. Se valida que sea participante real antes de dejarlo
        // entrar, para que un usuario no pueda escuchar conversaciones
        // ajenas manipulando el idConversacion desde la consola.
        socket.on('unirse_conversacion', async (idConversacion) => {
            try {
                const esParticipante = await ParticipanteConversacion.findOne({
                    where: { idConversacion, idUsuario: socket.idUsuario }
                });
                if (esParticipante) {
                    socket.join(`conversacion:${idConversacion}`);
                }
            } catch (error) {
                logger.error(`Error al unirse a conversación por socket: ${error.message}`);
            }
        });

        socket.on('salir_conversacion', (idConversacion) => {
            socket.leave(`conversacion:${idConversacion}`);
        });

        socket.on('disconnect', () => {
            logger.info(`Socket desconectado: usuario ${socket.idUsuario} (${socket.id})`);
        });
    });

    logger.info('Socket.io inicializado');
    return io;
};

/**
 * Devuelve la instancia de Socket.io ya inicializada, para que otros
 * servicios (mensajería, notificaciones) emitan eventos sin depender
 * directamente de server.js.
 */
const obtenerIO = () => io;

module.exports = { inicializarSocket, obtenerIO };