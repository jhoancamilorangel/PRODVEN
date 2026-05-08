const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./src/config/database');
require('./src/config/redis');

const errorHandler = require('./src/middlewares/errorHandler');
const authRoutes = require('./src/routes/authRoutes');

const app = express();

// =====================================================
// MIDDLEWARES DE SEGURIDAD Y REGISTRO
// =====================================================
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// =====================================================
// RATE LIMITER GLOBAL (Portero)
// =====================================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 peticiones por IP
    message: {
        success: false,
        message: 'Demasiadas peticiones, intenta de nuevo en 15 minutos'
    },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// =====================================================
// RUTAS DE LA API
// =====================================================
app.use('/api/auth', authRoutes);

// Ruta de salud
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'API de ProdVen funcionando correctamente',
        timestamp: new Date().toISOString()
    });
});

// =====================================================
// MANEJO DE ERRORES (siempre al final)
// =====================================================
app.use(errorHandler);

// =====================================================
// INICIAR SERVIDOR
// =====================================================
const startServer = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a MySQL (prodven_db) establecida con éxito.');

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            console.log(`🚀 Servidor ejecutándose en el puerto ${PORT}`);
            console.log(`📍 URL local: http://localhost:${PORT}`);
            console.log(`🩺 Health check: http://localhost:${PORT}/api/health`);
        });
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error);
        process.exit(1);
    }
};

startServer();