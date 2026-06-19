import { useAuth } from '../context/AuthContext';
import './Topbar.css';

/**
 * Barra superior del panel. Muestra el control del menú (móvil),
 * el usuario actual y la opción de cerrar sesión.
 */
function Topbar({ onToggleMenu }) {
    const { usuario, logout } = useAuth();

    const iniciales = usuario
        ? `${usuario.nombres?.[0] || ''}${usuario.apellidos?.[0] || ''}`.toUpperCase()
        : '';

    return (
        <header className="topbar">
            <button className="topbar-menu-btn" onClick={onToggleMenu} aria-label="Abrir menú">
                ☰
            </button>

            <div className="topbar-derecha">
                <div className="topbar-usuario">
                    <div className="topbar-avatar">{iniciales}</div>
                    <div className="topbar-usuario-info">
                        <span className="topbar-usuario-nombre">
                            {usuario?.nombres} {usuario?.apellidos}
                        </span>
                        <span className="topbar-usuario-rol">{usuario?.rol}</span>
                    </div>
                </div>
                <button className="topbar-logout" onClick={logout}>
                    Cerrar sesión
                </button>
            </div>
        </header>
    );
}

export default Topbar;