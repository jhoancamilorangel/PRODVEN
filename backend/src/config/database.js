const { Sequelize } = require('sequelize');
require('dotenv').config();

// Inicializar Sequelize con las credenciales del .env
const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
    logging: false, 
    define: {
      underscored: true, 
      timestamps: true,  
      freezeTableName: true 
    }
  }
);

module.exports = sequelize;