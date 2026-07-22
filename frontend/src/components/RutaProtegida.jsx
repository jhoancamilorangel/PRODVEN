import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

/**
 * Protege las rutas del panel administrativo de forma inteligente.
 * Revisa el sessionStorage de administración ('prodven_usuario') de manera directa
 * para evitar que las pestañas de clientes interfieran en las pruebas en paralelo.
 */
function RutaProtegida({ children }) {
    const { cargando } = useAuth();

    // En lugar de usar el estado global unificado que puede fluctuar por la URL de la pestaña,
    // leemos directamente el almacenamiento correspondiente a la zona administrativa.
    const tokenAdmin = sessionStorage.getItem('prodven_token');
    const usuarioAdminRaw = sessionStorage.getItem('prodven_usuario');
    
    let usuarioAdmin = null;
    if (usuarioAdminRaw) {
        try {
            usuarioAdmin = JSON.parse(usuarioAdminRaw);
        } catch (e) {
            usuarioAdmin = null;
        }
    }

    if (cargando) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Cargando...</div>;
    }

    // Si no hay token de administrador en el sessionStorage de esta pestaña, al login administrativo
    if (!tokenAdmin || !usuarioAdmin) {
        return <Navigate to="/login" replace />;
    }

    // Si el rol guardado en esta zona es cliente, bloquea el acceso
    if (usuarioAdmin.rol === 'cliente') {
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