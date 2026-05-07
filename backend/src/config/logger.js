const winston = require('winston');

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        // Guarda los errores en un archivo
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        // Guarda todos los registros en otro archivo
        new winston.transports.File({ filename: 'logs/combined.log' }),
    ],
});

// Si no estamos en producción, también los muestra en la consola con colores
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.simple(),
    }));
}

module.exports = logger;