import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Categorias from './pages/Categorias';
import Pedidos from './pages/Pedidos';
import Inventario from './pages/Inventario';
import Produccion from './pages/Produccion';
import Logistica from './pages/Logistica';
import Pagos from './pages/Pagos';
import Engagement from './pages/Engagement';
import Reportes from './pages/Reportes';
import Auditoria from './pages/Auditoria';
import Configuracion from './pages/Configuracion';
import MITienda from './pages/MITienda';
import Marketplace from './pages/Marketplace';
import Tienda from './pages/Tienda';
import AuthCliente from './pages/AuthCliente';
import ErrorBoundary from './components/ErrorBoundary';
import Producto from './pages/Producto';
import Carrito from './pages/Carrito';
import Checkout from './pages/Checkout';
import MisCompras from './pages/MisCompras';
import MiPerfil from './pages/MiPerfil';
import InventarioInterno from './pages/InventarioInterno';
import SolicitarNegocio from './pages/SolicitarNegocio';
import SolicitudesNegocio from './pages/SolicitudesNegocio';
import GestionEmpresas from './pages/GestionEmpresas';
import BandejaVendedor from './pages/BandejaVendedor';
import VistaChatCliente from './pages/VistaChatCliente';
import VistaSoporteCliente from './pages/VistaSoporteCliente';
import VistaSoporteVendedor from './pages/VistaSoporteVendedor';
import BandejaSoporteAdmin from './pages/BandejaSoporteAdmin';

// ==========================================================================
// COMPONENTE TEMPORAL: VISTA DE CHAT CLIENTE (PLACEHOLDER DE VERIFICACIÓN)
// ==========================================================================

const ManejarAccesoDenegado = () => {
    React.useEffect(() => {
        const manejarAccesoDenegado = (event) => {
            // Usar alert por ahora, luego puedes cambiarlo por tu sistema de notificaciones
            alert('🔒 ' + event.detail.mensaje);
            console.error('Acceso denegado:', event.detail.mensaje);
        };

        window.addEventListener('acceso-denegado', manejarAccesoDenegado);
        return () => window.removeEventListener('acceso-denegado', manejarAccesoDenegado);
    }, []);
    return null;
};


function App() {
    return (
        <AuthProvider>
            <ErrorBoundary>
                <ManejarAccesoDenegado/>
                <BrowserRouter>
                    <Routes>
                        <Route path="/login" element={<Navigate to="/cuenta" replace />} />

                        {/* ===== RUTAS PÚBLICAS (marketplace, clientes) ===== */}
                        <Route path="/marketplace" element={<Marketplace />} />
                        <Route path="/tienda/:idEmpresa" element={<Tienda />} />
                        <Route path="/cuenta" element={<AuthCliente />} />
                        <Route path="/producto/:idProducto" element={<Producto />} />
                        <Route path="/carrito" element={<Carrito />} />
                        <Route path="/checkout/:idEmpresa" element={<Checkout />} />
                        <Route path="/mis-compras" element={<MisCompras />} />
                        
                        {/* NUEVA RUTA CONECTADA: Captura el ID dinámico de la conversación */}
                       <Route path="/mis-compras/chat/:idEmpresa/:idConversacion" element={<VistaChatCliente />} />
                       <Route path="/mis-compras/chat/:idEmpresa/:idConversacion" element={<VistaChatCliente />} />
                       <Route path="/soporte" element={<VistaSoporteCliente />} />
                       <Route path="/soporte/:idConversacion" element={<VistaSoporteCliente />} />
                        
                        <Route path="/mi-perfil" element={<MiPerfil />} />
                        <Route path="/vender" element={<SolicitarNegocio />} />

                        {/* ===== RUTAS PROTEGIDAS (panel administrativo) ===== */}
                        <Route path="/dashboard" element={<RutaProtegida><Layout><Dashboard /></Layout></RutaProtegida>} />
                        <Route path="/productos" element={<RutaProtegida><Layout><Productos /></Layout></RutaProtegida>} />
                        <Route path="/categorias" element={<RutaProtegida><Layout><Categorias /></Layout></RutaProtegida>} />
                        <Route path="/pedidos" element={<RutaProtegida><Layout><Pedidos /></Layout></RutaProtegida>} />
                        <Route path="/inventario" element={<RutaProtegida><Layout><Inventario /></Layout></RutaProtegida>} />
                        <Route path="/control-inventario" element={<RutaProtegida><Layout><InventarioInterno /></Layout></RutaProtegida>} />
                        <Route path="/produccion" element={<RutaProtegida><Layout><Produccion /></Layout></RutaProtegida>} />
                        <Route path="/logistica" element={<RutaProtegida><Layout><Logistica /></Layout></RutaProtegida>} />
                        <Route path="/pagos" element={<RutaProtegida><Layout><Pagos /></Layout></RutaProtegida>} />
                        <Route path="/engagement" element={<RutaProtegida><Layout><Engagement /></Layout></RutaProtegida>} />
                        <Route path="/reportes" element={<RutaProtegida><Layout><Reportes /></Layout></RutaProtegida>} />
                        <Route path="/auditoria" element={<RutaProtegida><Layout><Auditoria /></Layout></RutaProtegida>} />
                        <Route path="/configuracion" element={<RutaProtegida><Layout><Configuracion /></Layout></RutaProtegida>} />
                        <Route path="/mi-tienda" element={<RutaProtegida><Layout><MiTienda /></Layout></RutaProtegida>} />
                        <Route path="/solicitudes" element={<RutaProtegida><Layout><SolicitudesNegocio /></Layout></RutaProtegida>} />
                        <Route path="/empresas" element={<RutaProtegida><Layout><GestionEmpresas /></Layout></RutaProtegida>} />
                        <Route path="/mensajes" element={<RutaProtegida><Layout><BandejaVendedor /></Layout></RutaProtegida>} />
                        <Route path="/mensajes" element={<RutaProtegida><Layout><BandejaVendedor /></Layout></RutaProtegida>} />
                        <Route path="/mensajes/:idConversacion" element={<RutaProtegida><Layout><BandejaVendedor /></Layout></RutaProtegida>} />
                        <Route path="/soporte-negocio" element={<RutaProtegida><Layout><VistaSoporteVendedor /></Layout></RutaProtegida>} />
                        <Route path="/soporte-negocio/:idConversacion" element={<RutaProtegida><Layout><VistaSoporteVendedor /></Layout></RutaProtegida>} />
                        <Route path="/soporte-admin" element={<RutaProtegida><Layout><BandejaSoporteAdmin /></Layout></RutaProtegida>} />
                        <Route path="/soporte-admin/:idConversacion" element={<RutaProtegida><Layout><BandejaSoporteAdmin /></Layout></RutaProtegida>} />
                        <Route path="/mensajes/:idConversacion" element={<RutaProtegida><Layout><BandejaVendedor /></Layout></RutaProtegida>} />

                        <Route path="*" element={<Navigate to="/dashboard" replace />} />
                    </Routes>
                </BrowserRouter>
            </ErrorBoundary>
        </AuthProvider>
    );
}

export default App;