import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

/**
 * Protege las rutas del panel administrativo.
 * - Si no hay sesión, redirige al login.
 * - Si hay sesión pero el rol es 'cliente', bloquea el acceso:
 *   el panel es solo para roles de negocio (admin, vendedor, etc.).
 *   Un cliente del marketplace no tiene nada que hacer aquí.
 */
function RutaProtegida({ children }) {
    const { estaAutenticado, usuario, cargando } = useAuth();

    if (cargando) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;
    }

    if (!estaAutenticado) {
        return <Navigate to="/login" replace />;
    }

    // Un cliente NO puede entrar al panel administrativo
    if (usuario && usuario.rol === 'cliente') {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '18px',
                padding: '40px 24px',
                textAlign: 'center',
                background: '#f4f6fa'
            }}>
                <div style={{
                    width: '72px', height: '72px', borderRadius: '50%',
                    background: 'rgba(231, 76, 60, 0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: '#e74c3c'
                }}>
                    <ShieldAlert size={38} />
                </div>
                <h2 style={{ color: '#0A2A43', margin: 0, fontSize: '22px' }}>No tienes acceso</h2>
                <p style={{ color: '#6b7280', margin: 0, maxWidth: '420px', lineHeight: 1.5 }}>
                    Esta sección es solo para negocios. Tu cuenta es de cliente y está pensada para comprar en el marketplace.
                </p>
                <a href="/marketplace" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '8px',
                    background: '#163b73', color: '#fff', textDecoration: 'none',
                    padding: '12px 24px', borderRadius: '12px', fontSize: '14.5px', fontWeight: 600
                }}>
                    Ir al marketplace
                </a>
            </div>
        );
    }

    return children;
}

export default RutaProtegida;