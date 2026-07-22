import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import BotonChatCliente from '../components/chat/BotonChatCliente';
import {
    MapPin, Star, ShoppingCart, Search, ArrowLeft,
    Package, Frown, Phone
} from 'lucide-react';
import './Tienda.css';

function Tienda() {
    const { idEmpresa } = useParams();
    const navigate = useNavigate();

    const [tienda, setTienda] = useState(null);
    const [productos, setProductos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const [resTienda, resProd] = await Promise.all([
                marketplaceService.obtenerTienda(idEmpresa).catch(() => null),
                marketplaceService.listarProductos(idEmpresa).catch(() => null)
            ]);

            if (resTienda) {
                setTienda(resTienda.data.data?.empresa || resTienda.data.data || null);
            }
            if (resProd) {
                const datos = resProd.data.data?.productos || resProd.data.data || [];
                setProductos(Array.isArray(datos) ? datos : []);
            }
        } catch {
            setTienda(null);
        } finally {
            setCargando(false);
        }
    }, [idEmpresa]);

    useEffect(() => { cargar(); }, [cargar]);

    const colorPrimario = tienda?.colorPrimario || '#163b73';
    const colorSecundario = tienda?.colorSecundario || '#27AE60';

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const productosFiltrados = productos.filter((p) =>
        !busqueda || (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase())
    );

    if (cargando) {
        return (
            <div className="tnd">
                <MarketplaceHeader />
                <div className="tnd-cargando"><div className="tnd-spinner"></div><p>Cargando tienda...</p></div>
            </div>
        );
    }

    if (!tienda) {
        return (
            <div className="tnd">
                <MarketplaceHeader />
                <div className="tnd-vacio">
                    <Frown size={56} strokeWidth={1.3} />
                    <h3>Tienda no encontrada</h3>
                    <p>Esta tienda no está disponible o no existe.</p>
                    <button className="tnd-btn-volver" onClick={() => navigate('/marketplace')}>
                        <ArrowLeft size={16} /> Volver al marketplace
                    </button>
                </div>
                <MarketplaceFooter />
            </div>
        );
    }

    const inicial = (tienda.nombre || 'T')[0].toUpperCase();

    return (
        <div className="tnd" style={{ '--tienda-primario': colorPrimario, '--tienda-secundario': colorSecundario }}>
            <MarketplaceHeader />

            {/* PORTADA DE LA TIENDA */}
            <section
                className="tnd-portada"
                style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})` }}
            >
                <div className="tnd-portada-overlay"></div>
                <button className="tnd-volver" onClick={() => navigate('/marketplace')}>
                    <ArrowLeft size={18} /> Marketplace
                </button>
                <div className="tnd-portada-contenido">
                    <div className="tnd-portada-avatar" style={{ color: colorPrimario }}>
                        {tienda.logoUrl ? <img src={tienda.logoUrl} alt={tienda.nombre} /> : inicial}
                    </div>
                    <div className="tnd-portada-info">
                        <h1>{tienda.nombre}</h1>
                        <p>{tienda.descripcion || tienda.descripcionCorta || tienda.categoria || 'Bienvenido a nuestra tienda'}</p>
                        <div className="tnd-portada-meta">
                            {tienda.ciudad && <span><MapPin size={15} /> {tienda.ciudad}</span>}
                            {tienda.calificacionPromedio > 0 && (
                                <span><Star size={15} fill="currentColor" /> {parseFloat(tienda.calificacionPromedio).toFixed(1)}</span>
                            )}
                            {tienda.telefono && <span><Phone size={15} /> {tienda.telefono}</span>}
                        </div>
                    </div>
                </div>
            </section>

            {/* CONTENIDO */}
            <main className="tnd-main">
                <div className="tnd-controles">
                    <div className="tnd-buscador">
                        <Search size={18} />
                        <input
                            type="text"
                            placeholder="Buscar en esta tienda..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div className="tnd-productos-cabecera">
                    <h2>Productos</h2>
                    <span>{productosFiltrados.length} producto(s)</span>
                </div>

                {productosFiltrados.length === 0 ? (
                    <div className="tnd-vacio-productos">
                        <Package size={48} strokeWidth={1.3} />
                        <h3>No hay productos</h3>
                        <p>{busqueda ? 'Prueba con otra búsqueda.' : 'Esta tienda aún no tiene productos publicados.'}</p>
                    </div>
                ) : (
                    <div className="tnd-grid">
                        {productosFiltrados.map((p) => (
                            <article className="tnd-producto" key={p.idProducto} onClick={() => navigate(`/producto/${p.idProducto}?tienda=${idEmpresa}`)}>
                                <div className="tnd-producto-img">
                                    {p.imagenPrincipal || p.imagenUrl ? (
                                        <img src={p.imagenPrincipal || p.imagenUrl} alt={p.nombre} />
                                    ) : (
                                        <div className="tnd-producto-placeholder" style={{ background: `${colorPrimario}10` }}>
                                            <Package size={40} style={{ color: colorPrimario }} />
                                        </div>
                                    )}
                                    {p.disponible === false && <span className="tnd-producto-agotado">Agotado</span>}
                                </div>
                                <div className="tnd-producto-cuerpo">
                                    <h3>{p.nombre}</h3>
                                    {p.descripcionCorta && <p className="tnd-producto-desc">{p.descripcionCorta}</p>}
                                    <div className="tnd-producto-pie">
                                        <span className="tnd-producto-precio" style={{ color: colorPrimario }}>
                                            {formatoMoneda(p.precioEfectivo || p.precioVenta)}
                                        </span>
                                        <button
                                            className="tnd-producto-btn"
                                            style={{ background: colorPrimario }}
                                            onClick={(e) => { e.stopPropagation(); navigate(`/producto/${p.idProducto}?tienda=${idEmpresa}`); }}
                                        >
                                            <ShoppingCart size={16} />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </main>
            {/* BOTÓN FLOTANTE DE MENSAJERÍA PARA EL CLIENTE */}
            <BotonChatCliente 
                idEmpresa={idEmpresa} 
                nombreEmpresa={tienda.nombre} 
            />

            <MarketplaceFooter />
        </div>
    );
}

export default Tienda;