import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import marketplaceService from '../services/marketplaceService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    Package, Star, ShoppingCart, Minus, Plus, ArrowLeft,
    ShieldCheck, Truck, Frown, MessageSquare, AlertTriangle
} from 'lucide-react';
import './Producto.css';

const UMBRAL_STOCK_BAJO = 10;

function Producto() {
    const { idProducto } = useParams();
    const [searchParams] = useSearchParams();
    const idEmpresa = searchParams.get('tienda');
    const navigate = useNavigate();
    const toast = useToast();

    const [producto, setProducto] = useState(null);
    const [resenas, setResenas] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [cantidad, setCantidad] = useState(1);
    const [agregando, setAgregando] = useState(false);

    const estaLogueado = () => !!sessionStorage.getItem('prodven_cli_token');

    const cargar = useCallback(async () => {
        if (!idProducto) return;
        try {
            setCargando(true);
            const [resProd, resResenas] = await Promise.all([
                marketplaceService.obtenerProducto(idProducto, idEmpresa).catch(() => null),
                marketplaceService.listarResenasProducto(idProducto).catch(() => null)
            ]);

            if (resProd) {
                setProducto(resProd.data.data?.producto || resProd.data.data || null);
            }
            if (resResenas) {
                const datos = resResenas.data.data?.resenas || resResenas.data.data || [];
                setResenas(Array.isArray(datos) ? datos : []);
            }
        } catch {
            setProducto(null);
        } finally {
            setCargando(false);
        }
    }, [idProducto, idEmpresa]);

    useEffect(() => { cargar(); }, [cargar]);

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const agregarAlCarrito = async () => {
        if (!estaLogueado()) {
            toast.info('Inicia sesión para agregar productos al carrito.');
            setTimeout(() => navigate('/cuenta'), 800);
            return;
        }
        const empresaProducto = idEmpresa || producto?.idEmpresa;
        if (!empresaProducto) {
            toast.error('No se pudo identificar la tienda del producto.');
            return;
        }
        setAgregando(true);
        try {
            await marketplaceService.agregarAlCarrito(empresaProducto, idProducto, cantidad);
            toast.exito(`${cantidad} ${cantidad > 1 ? 'unidades agregadas' : 'unidad agregada'} al carrito.`);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo agregar al carrito.');
        } finally {
            setAgregando(false);
        }
    };

    const promedioResenas = resenas.length > 0
        ? (resenas.reduce((sum, r) => sum + (parseFloat(r.calificacion) || 0), 0) / resenas.length).toFixed(1)
        : null;

    if (cargando) {
        return (
            <div className="prd">
                <MarketplaceHeader />
                <div className="prd-cargando"><div className="prd-spinner"></div><p>Cargando producto...</p></div>
            </div>
        );
    }

    if (!producto) {
        return (
            <div className="prd">
                <MarketplaceHeader />
                <div className="prd-vacio">
                    <Frown size={56} strokeWidth={1.3} />
                    <h3>Producto no encontrado</h3>
                    <button className="prd-btn-volver" onClick={() => navigate(-1)}>
                        <ArrowLeft size={16} /> Volver
                    </button>
                </div>
                <MarketplaceFooter />
            </div>
        );
    }

    const precio = producto.precioEfectivo || producto.precioVenta || producto.precio || 0;
    const imagen = producto.imagenPrincipal || producto.imagenUrl;

    // Lógica de stock:
    // - gestionaStock false => no se controla (ilimitado)
    // - cantidadStock numérico => se respeta como tope
    const gestionaStock = producto.gestionaStock !== false && producto.cantidadStock !== null && producto.cantidadStock !== undefined;
    const stock = gestionaStock ? Number(producto.cantidadStock) : null;

    const sinStock = producto.disponible === false || (gestionaStock && stock <= 0);
    const stockBajo = gestionaStock && stock > 0 && stock <= UMBRAL_STOCK_BAJO;

    // Tope del selector: el stock real si se gestiona, o un máximo razonable si no
    const maxCantidad = gestionaStock ? stock : 99;

    const renderEstrellas = (cal, size = 16) => {
        const c = Math.round(parseFloat(cal) || 0);
        return [1,2,3,4,5].map((n) => (
            <Star key={n} size={size} className={n <= c ? 'prd-estrella-llena' : 'prd-estrella-vacia'} />
        ));
    };

    return (
        <div className="prd">
            <MarketplaceHeader />

            <main className="prd-main">
                <button className="prd-volver" onClick={() => navigate(-1)}>
                    <ArrowLeft size={18} /> Volver
                </button>

                <div className="prd-detalle">
                    {/* Imagen */}
                    <div className="prd-imagen">
                        {imagen ? (
                            <img src={imagen} alt={producto.nombre} />
                        ) : (
                            <div className="prd-imagen-placeholder"><Package size={80} /></div>
                        )}
                        {sinStock && <span className="prd-agotado-badge">Agotado</span>}
                    </div>

                    {/* Info */}
                    <div className="prd-info">
                        {producto.categoria && <span className="prd-categoria">{producto.categoria}</span>}
                        <h1>{producto.nombre}</h1>

                        {promedioResenas && (
                            <div className="prd-rating">
                                <div className="prd-estrellas">{renderEstrellas(promedioResenas)}</div>
                                <span>{promedioResenas} ({resenas.length} reseña{resenas.length !== 1 ? 's' : ''})</span>
                            </div>
                        )}

                        <div className="prd-precio">{formatoMoneda(precio)}</div>

                        {producto.descripcion && <p className="prd-descripcion">{producto.descripcion}</p>}

                        <div className="prd-stock-info">
                            {sinStock ? (
                                <span className="prd-stock-agotado">Sin existencias</span>
                            ) : stockBajo ? (
                                <span className="prd-stock-bajo"><AlertTriangle size={16} /> ¡Solo quedan {stock} unidades!</span>
                            ) : (
                                <span className="prd-stock-disponible"><ShieldCheck size={16} /> Disponible</span>
                            )}
                        </div>

                        {!sinStock && (
                            <div className="prd-compra">
                                <div className="prd-cantidad">
                                    <button onClick={() => setCantidad((c) => Math.max(1, c - 1))}><Minus size={16} /></button>
                                    <span>{cantidad}</span>
                                    <button onClick={() => setCantidad((c) => Math.min(maxCantidad, c + 1))} disabled={cantidad >= maxCantidad}><Plus size={16} /></button>
                                </div>
                                <button className="prd-btn-carrito" onClick={agregarAlCarrito} disabled={agregando}>
                                    <ShoppingCart size={20} />
                                    {agregando ? 'Agregando...' : 'Agregar al carrito'}
                                </button>
                            </div>
                        )}

                        {/* Aviso cuando el cliente llega al tope de unidades disponibles */}
                        {!sinStock && gestionaStock && cantidad >= maxCantidad && (
                            <p className="prd-tope-aviso">Has alcanzado el máximo disponible de este producto.</p>
                        )}

                        <div className="prd-garantias">
                            <div className="prd-garantia"><Truck size={18} /> Envío a domicilio disponible</div>
                            <div className="prd-garantia"><ShieldCheck size={18} /> Compra protegida</div>
                        </div>
                    </div>
                </div>

                {/* Reseñas */}
                <section className="prd-resenas">
                    <h2><MessageSquare size={20} /> Reseñas de clientes</h2>
                    {resenas.length === 0 ? (
                        <div className="prd-sin-resenas">
                            <p>Este producto aún no tiene reseñas.</p>
                        </div>
                    ) : (
                        <div className="prd-resenas-lista">
                            {resenas.map((r, i) => (
                                <div className="prd-resena" key={r.idResena || i}>
                                    <div className="prd-resena-cabecera">
                                        <div className="prd-resena-avatar">{(r.nombreCliente || 'C')[0].toUpperCase()}</div>
                                        <div>
                                            <span className="prd-resena-nombre">{r.nombreCliente || 'Cliente'}</span>
                                            <div className="prd-estrellas">{renderEstrellas(r.calificacion, 13)}</div>
                                        </div>
                                    </div>
                                    {r.titulo && <h4 className="prd-resena-titulo">{r.titulo}</h4>}
                                    <p className="prd-resena-comentario">{r.comentario || 'Sin comentario'}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>

            <MarketplaceFooter />
        </div>
    );
}

export default Producto;