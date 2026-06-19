import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Componente que protege rutas privadas.
 * Si el usuario está autenticado, muestra el contenido.
 * Si no, lo redirige al login.
 */
function RutaProtegida({ children }) {
    const { estaAutenticado, cargando } = useAuth();

    // Mientras revisa si hay sesión guardada, no decide aún
    if (cargando) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;
    }

    // Si no está autenticado, al login
    if (!estaAutenticado) {
        return <Navigate to="/login" replace />;
    }

    // Si está autenticado, muestra la página protegida
    return children;
}

export default RutaProtegida;