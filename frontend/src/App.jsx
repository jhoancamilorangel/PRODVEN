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
import MiTienda from './pages/MiTienda';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/dashboard"
                        element={
                            <RutaProtegida>
                                <Layout><Dashboard /></Layout>
                            </RutaProtegida>
                        }
                    />
                    <Route
                        path="/productos"
                        element={
                            <RutaProtegida>
                                <Layout><Productos /></Layout>
                            </RutaProtegida>
                        }
                    />
                    <Route
    path="/categorias"
    element={
        <RutaProtegida>
            <Layout><Categorias /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/pedidos"
    element={
        <RutaProtegida>
            <Layout><Pedidos /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/inventario"
    element={
        <RutaProtegida>
            <Layout><Inventario /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/produccion"
    element={
        <RutaProtegida>
            <Layout><Produccion /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/logistica"
    element={
        <RutaProtegida>
            <Layout><Logistica /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/pagos"
    element={
        <RutaProtegida>
            <Layout><Pagos /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/engagement"
    element={
        <RutaProtegida>
            <Layout><Engagement /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/reportes"
    element={
        <RutaProtegida>
            <Layout><Reportes /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/auditoria"
    element={
        <RutaProtegida>
            <Layout><Auditoria /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/configuracion"
    element={
        <RutaProtegida>
            <Layout><Configuracion /></Layout>
        </RutaProtegida>
    }
/>
<Route
    path="/mi-tienda"
    element={
        <RutaProtegida>
            <Layout><MiTienda /></Layout>
        </RutaProtegida>
    }
/>
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;