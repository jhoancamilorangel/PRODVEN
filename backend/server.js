const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const sequelize = require('./src/config/database');
require('./src/config/redis');

const errorHandler = require('./src/middlewares/errorHandler');

// =====================================================
// IMPORTACIÓN DE RUTAS
// =====================================================
const authRoutes = require('./src/routes/authRoutes');
const empresaRoutes = require('./src/routes/empresaRoutes');
const suscripcionRoutes = require('./src/routes/suscripcionRoutes');
const configuracionRoutes = require('./src/routes/configuracionRoutes');
const categoriaRoutes = require('./src/routes/categoriaRoutes');
const proveedorRoutes = require('./src/routes/proveedorRoutes');
const productoRoutes = require('./src/routes/productoRoutes');
const inventarioRoutes = require('./src/routes/inventarioRoutes');
const bodegaRoutes = require('./src/routes/bodegaRoutes');
const reservaRoutes = require('./src/routes/reservaRoutes');
const bomRoutes = require('./src/routes/bomRoutes');
const ordenProduccionRoutes = require('./src/routes/ordenProduccionRoutes');
const consumoRoutes = require('./src/routes/consumoRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes');
const pagoRoutes = require('./src/routes/pagoRoutes');
const webhookRoutes = require('./src/routes/webhookRoutes');
const carritoRoutes = require('./src/routes/carritoRoutes');
const pedidoRoutes = require('./src/routes/pedidoRoutes');
const ubicacionRoutes = require('./src/routes/ubicacionRoutes');
const zonaRoutes = require('./src/routes/zonaRoutes');
const mensajeriaRoutes = require('./src/routes/mensajeriaRoutes');

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
app.use('/api/empresas', empresaRoutes);
app.use('/api/suscripciones', suscripcionRoutes);
app.use('/api/configuracion', configuracionRoutes);
app.use('/api/categorias', categoriaRoutes);
app.use('/api/proveedores', proveedorRoutes);
app.use('/api/productos', productoRoutes);
app.use('/api/inventario', inventarioRoutes);
app.use('/api/bodegas', bodegaRoutes);
app.use('/api/reservas', reservaRoutes);
app.use('/api/bom', bomRoutes);
app.use('/api/ordenes-produccion', ordenProduccionRoutes);
app.use('/api/consumos', consumoRoutes);
app.use('/api/usuarios', usuarioRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/carrito', carritoRoutes);
app.use('/api', ubicacionRoutes);
app.use('/api/pedidos', pedidoRoutes);
app.use('/api/zonas', zonaRoutes);
app.use('/api/conversaciones', mensajeriaRoutes);

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