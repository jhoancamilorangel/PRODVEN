const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

// Importar la conexión a la base de datos
const sequelize = require('./src/config/database');

const app = express();
require('./src/config/redis');
const errorHandler = require('./src/middlewares/errorHandler');
const rateLimit = require('express-rate-limit');

// Middlewares de seguridad y registro
app.use(helmet()); 
app.use(cors()); 
app.use(morgan('dev')); 
app.use(express.json()); 

// Configuración del límite de peticiones (Portero)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // Máximo 100 peticiones por IP
    message: 'Demasiadas peticiones, intenta de nuevo en 15 minutos'
});
app.use(limiter);

// Ruta base de prueba
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'success', 
    message: 'API de ProdVen funcionando correctamente' 
  });
});
app.use(errorHandler);
// Función para iniciar el servidor y conectar a la BD
const startServer = async () => {
  try {
    // Autenticar la conexión con MySQL
    await sequelize.authenticate();
    console.log('✅ Conexión a MySQL (prodven_db) establecida con éxito.');

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
    //  console.log(🚀 Servidor ejecutándose en el puerto ${PORT}´});
    });
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error);
    process.exit(1); 
  }
};

startServer();