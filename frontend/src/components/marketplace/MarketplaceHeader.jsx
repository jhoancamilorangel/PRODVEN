import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import marketplaceService from '../../services/marketplaceService';
import { Store, Search, ShoppingCart, Package, User, LogOut, ChevronDown } from 'lucide-react';
import './MarketplaceHeader.css';
import authClienteService from '../../services/authClienteService';
import CampanaNotificaciones from '../notificaciones/CampanaNotificaciones';

function MarketplaceHeader({ busqueda, onBuscar }) {
    const navigate = useNavigate();
    const [texto, setTexto] = useState(busqueda || '');
    const [totalItems, setTotalItems] = useState(0);
    const [menuAbierto, setMenuAbierto] = useState(false);
    const [usuario, setUsuario] = useState(null);
    const menuRef = useRef(null);

    const estaLogueado = () => !!sessionStorage.getItem('prodven_cli_token');

    useEffect(() => {
        // Cargar usuario del cliente si hay sesión
        const raw = sessionStorage.getItem('prodven_cli_usuario');
        if (raw) {
            try { setUsuario(JSON.parse(raw)); } catch { setUsuario(null); }
        }

        // Cargar el contador del carrito solo si hay cliente logueado
        const cargarContador = async () => {
            if (!estaLogueado()) {
                setTotalItems(0);
                return;
            }
            try {
                const res = await marketplaceService.obtenerTodosLosCarritos();
                const total = res.data.data?.resumen?.totalItems || 0;
                setTotalItems(total);
            } catch {
                setTotalItems(0);
            }
        };
        cargarContador();
    }, []);

    // Cerrar el menú al hacer clic fuera
    useEffect(() => {
        const alClicFuera = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuAbierto(false);
            }
        };
        document.addEventListener('mousedown', alClicFuera);
        return () => document.removeEventListener('mousedown', alClicFuera);
    }, []);

    const buscar = (e) => {
        e.preventDefault();
        if (onBuscar) onBuscar(texto);
    };

   const cerrarSesion = async () => {
    const refreshToken = sessionStorage.getItem('prodven_cli_refresh');

    try {
        await authClienteService.logout(refreshToken);
    } catch (error) {
        console.error('Error al cerrar sesión en el servidor:', error);
    }

    sessionStorage.removeItem('prodven_cli_token');
    sessionStorage.removeItem('prodven_cli_refresh');
    sessionStorage.removeItem('prodven_cli_usuario');
    setMenuAbierto(false);
    navigate('/marketplace');
    // Recargar para limpiar cualquier estado en memoria
    setTimeout(() => window.location.reload(), 50);
};
    const logueado = estaLogueado();
    const nombre = usuario?.nombres || '';
    const apellido = usuario?.apellidos || '';
    const iniciales = ((nombre[0] || '') + (apellido[0] || '')).toUpperCase() || 'U';

    return (
        <header className="mkt-header">
            <div className="mkt-header-contenido">
                <button className="mkt-logo" onClick={() => navigate('/marketplace')}>
                    <div className="mkt-logo-icono"><Store size={22} /></div>
                    <span className="mkt-logo-texto">ProdVen</span>
                </button>

                <form className="mkt-buscador" onSubmit={buscar}>
                    <Search size={19} className="mkt-buscador-icono" />
                    <input
                        type="text"
                        placeholder="Busca tiendas o productos..."
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                    />
                    <button type="submit" className="mkt-buscador-btn">Buscar</button>
                </form>

                <div className="mkt-header-acciones">
                    <button className="mkt-header-btn mkt-header-carrito" onClick={() => navigate('/carrito')}>
                        <ShoppingCart size={20} />
                        {totalItems > 0 && <span className="mkt-carrito-badge">{totalItems}</span>}
                        <span className="mkt-header-btn-texto">Carrito</span>
                    </button>

                    {logueado && <CampanaNotificaciones zona="cliente" />}

                    {logueado && (
                        <button className="mkt-header-btn" onClick={() => navigate('/mis-compras')}>
                            <Package size={20} />
                            <span className="mkt-header-btn-texto">Mis compras</span>
                        </button>
                    )}

                    {logueado ? (
                        <div className="mkt-cuenta" ref={menuRef}>
                            <button
                                className={`mkt-cuenta-btn ${menuAbierto ? 'mkt-cuenta-btn-activo' : ''}`}
                                onClick={() => setMenuAbierto((v) => !v)}
                            >
                                <span className="mkt-avatar">{iniciales}</span>
                                <span className="mkt-cuenta-nombre">{nombre || 'Mi cuenta'}</span>
                                <ChevronDown size={16} className={`mkt-cuenta-flecha ${menuAbierto ? 'mkt-cuenta-flecha-abierta' : ''}`} />
                            </button>

                            {menuAbierto && (
                                <div className="mkt-menu">
                                    <div className="mkt-menu-cabecera">
                                        <span className="mkt-avatar mkt-avatar-grande">{iniciales}</span>
                                        <div className="mkt-menu-info">
                                            <strong>{nombre} {apellido}</strong>
                                            <span>{usuario?.correo || ''}</span>
                                        </div>
                                    </div>
                                    <div className="mkt-menu-divisor"></div>
                                    <button className="mkt-menu-item" onClick={() => { setMenuAbierto(false); navigate('/mis-compras'); }}>
                                        <Package size={17} /> Mis compras
                                    </button>
                                    <button className="mkt-menu-item" onClick={() => { setMenuAbierto(false); navigate('/mi-perfil'); }}>
                                        <User size={17} /> Mi perfil
                                    </button>
                                    <button className="mkt-menu-item mkt-menu-item-vender" onClick={() => { setMenuAbierto(false); navigate('/vender'); }}>
                                        <Store size={17} /> Vender en ProdVen
                                    </button>
                                    <div className="mkt-menu-divisor"></div>
                                    <button className="mkt-menu-item mkt-menu-item-salir" onClick={cerrarSesion}>
                                        <LogOut size={17} /> Cerrar sesión
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <button className="mkt-header-btn mkt-header-ingresar" onClick={() => navigate('/cuenta')}>
                            <User size={20} />
                            <span className="mkt-header-btn-texto">Ingresar</span>
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
}

export default MarketplaceHeader;