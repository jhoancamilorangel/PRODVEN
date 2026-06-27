const InvCategoria = require('./InvCategoria');
const InvProveedor = require('./InvProveedor');
const InvBodega = require('./InvBodega');
const InvArticulo = require('./InvArticulo');
const InvStock = require('./InvStock');
const InvMovimiento = require('./InvMovimiento');
const InvLote = require('./InvLote');

// ===== ASOCIACIONES DEL MÓDULO DE INVENTARIO INTERNO =====

// Artículo pertenece a una categoría
InvArticulo.belongsTo(InvCategoria, { foreignKey: 'idCategoria', as: 'categoria' });
InvCategoria.hasMany(InvArticulo, { foreignKey: 'idCategoria', as: 'articulos' });

// Artículo pertenece a un proveedor
InvArticulo.belongsTo(InvProveedor, { foreignKey: 'idProveedor', as: 'proveedor' });
InvProveedor.hasMany(InvArticulo, { foreignKey: 'idProveedor', as: 'articulos' });

// Stock: pertenece a un artículo y a una bodega
InvStock.belongsTo(InvArticulo, { foreignKey: 'idArticulo', as: 'articulo' });
InvArticulo.hasMany(InvStock, { foreignKey: 'idArticulo', as: 'stocks' });
InvStock.belongsTo(InvBodega, { foreignKey: 'idBodega', as: 'bodega' });
InvBodega.hasMany(InvStock, { foreignKey: 'idBodega', as: 'stocks' });

// Movimiento: pertenece a un artículo y a una bodega
InvMovimiento.belongsTo(InvArticulo, { foreignKey: 'idArticulo', as: 'articulo' });
InvArticulo.hasMany(InvMovimiento, { foreignKey: 'idArticulo', as: 'movimientos' });
InvMovimiento.belongsTo(InvBodega, { foreignKey: 'idBodega', as: 'bodega' });

// Lote: pertenece a un artículo y a una bodega
InvLote.belongsTo(InvArticulo, { foreignKey: 'idArticulo', as: 'articulo' });
InvArticulo.hasMany(InvLote, { foreignKey: 'idArticulo', as: 'lotes' });

module.exports = {
    InvCategoria,
    InvProveedor,
    InvBodega,
    InvArticulo,
    InvStock,
    InvMovimiento,
    InvLote
};