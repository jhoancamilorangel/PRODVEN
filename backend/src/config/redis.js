const { createClient } = require('redis');
require('dotenv').config();

// Configuración del cliente con las variables de entorno
const redisClient = createClient({
    password: process.env.REDIS_PASSWORD || undefined,
    socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379
    }
});

// Listeners para monitorear el estado en la consola
redisClient.on('connect', () => console.log('✅ Cliente Redis conectado (Listo para Caché y Sesiones).'));
redisClient.on('error', (err) => console.error('❌ Error en el cliente Redis:', err));

// Función para inicializar la conexión
const connectRedis = async () => {
    try {
        await redisClient.connect();
    } catch (error) {
        console.error('❌ Fallo al conectar con Redis. Verifica que el motor esté encendido.');
    }
};

connectRedis();

module.exports = redisClient;