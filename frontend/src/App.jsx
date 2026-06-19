import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RutaProtegida from './components/RutaProtegida';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Productos from './pages/Productos';
import Categorias from './pages/Categorias';
import Pedidos from './pages/Pedidos';

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
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;