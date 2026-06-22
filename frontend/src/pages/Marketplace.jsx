import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import marketplaceService from '../services/marketplaceService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    Store, MapPin, Star, ArrowRight, ShoppingBag,
    Sparkles, TrendingUp, Search, Frown
} from 'lucide-react';
import './Marketplace.css';

function Marketplace() {
    const navigate = useNavigate();
    const [tiendas, setTiendas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const cargar = useCallback(async (texto = '') => {
        try {
            setCargando(true);
            const params = texto ? { busqueda: texto } : {};
            const res = await marketplaceService.listarTiendas(params);
            const datos = res.data.data?.empresas || res.data.data?.tiendas || res.data.data || [];
            setTiendas(Array.isArray(datos) ? datos : []);
        } catch {
            setTiendas([]);
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const onBuscar = (texto) => {
        setBusqueda(texto);
        cargar(texto);
    };

    const irATienda = (id) => navigate(`/tienda/${id}`);

    return (
        <div className="mkt">
            <MarketplaceHeader busqueda={busqueda} onBuscar={onBuscar} />

            {/* HERO */}
            <section className="mkt-hero">
                <div className="mkt-hero-fondo"></div>
                <div className="mkt-hero-contenido">
                    <span className="mkt-hero-badge"><Sparkles size={15} /> El marketplace de los negocios locales</span>
                    <h1>Descubre tiendas y productos<br />cerca de ti</h1>
                    <p>Explora negocios locales, compara productos y compra en línea de forma fácil y segura.</p>
                    <form
                        className="mkt-hero-buscador"
                        onSubmit={(e) => { e.preventDefault(); onBuscar(e.target.elements.q.value); }}
                    >
                        <Search size={20} />
                        <input name="q" type="text" placeholder="¿Qué estás buscando hoy?" />
                        <button type="submit">Explorar</button>
                    </form>
                </div>
            </section>

            {/* CONTENIDO */}
            <main className="mkt-main">
                <div className="mkt-seccion-cabecera">
                    <div>
                        <h2>
                            {busqueda ? `Resultados para "${busqueda}"` : 'Tiendas destacadas'}
                        </h2>
                        <p>{busqueda ? `${tiendas.length} tienda(s) encontrada(s)` : 'Explora los negocios disponibles en el marketplace'}</p>
                    </div>
                    {!busqueda && (
                        <span className="mkt-seccion-pill"><TrendingUp size={15} /> Populares</span>
                    )}
                </div>

                {cargando ? (
                    <div className="mkt-grid">
                        {[...Array(6)].map((_, i) => (
                            <div className="mkt-tienda-skeleton" key={i}>
                                <div className="mkt-skeleton-banner"></div>
                                <div className="mkt-skeleton-linea"></div>
                                <div className="mkt-skeleton-linea corta"></div>
                            </div>
                        ))}
                    </div>
                ) : tiendas.length === 0 ? (
                    <div className="mkt-vacio">
                        <Frown size={56} strokeWidth={1.3} />
                        <h3>{busqueda ? 'No encontramos tiendas' : 'Aún no hay tiendas disponibles'}</h3>
                        <p>{busqueda ? 'Intenta con otra búsqueda.' : 'Pronto los negocios abrirán sus tiendas aquí.'}</p>
                    </div>
                ) : (
                    <div className="mkt-grid">
                        {tiendas.map((t) => {
                            const colorPrimario = t.colorPrimario || '#163b73';
                            const colorSecundario = t.colorSecundario || '#27AE60';
                            const inicial = (t.nombre || 'T')[0].toUpperCase();
                            return (
                                <article className="mkt-tienda" key={t.idEmpresa} onClick={() => irATienda(t.idEmpresa)}>
                                    <div
                                        className="mkt-tienda-banner"
                                        style={{ background: `linear-gradient(135deg, ${colorPrimario}, ${colorSecundario})` }}
                                    >
                                        <div className="mkt-tienda-avatar" style={{ color: colorPrimario }}>
                                            {t.logoUrl ? <img src={t.logoUrl} alt={t.nombre} /> : inicial}
                                        </div>
                                    </div>
                                    <div className="mkt-tienda-cuerpo">
                                        <h3>{t.nombre}</h3>
                                        {t.descripcionCorta || t.descripcion ? (
                                            <p className="mkt-tienda-desc">{t.descripcionCorta || t.descripcion}</p>
                                        ) : (
                                            <p className="mkt-tienda-desc">{t.categoria || 'Tienda en ProdVen'}</p>
                                        )}
                                        <div className="mkt-tienda-meta">
                                            {t.ciudad && (
                                                <span className="mkt-tienda-ciudad"><MapPin size={13} /> {t.ciudad}</span>
                                            )}
                                            {(t.calificacionPromedio > 0) && (
                                                <span className="mkt-tienda-rating"><Star size={13} fill="currentColor" /> {parseFloat(t.calificacionPromedio).toFixed(1)}</span>
                                            )}
                                        </div>
                                        <button className="mkt-tienda-btn" style={{ background: colorPrimario }}>
                                            Visitar tienda <ArrowRight size={16} />
                                        </button>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </main>

            <MarketplaceFooter />
        </div>
    );
}

export default Marketplace;