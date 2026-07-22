import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import marketplaceService from '../services/marketplaceService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    ShoppingCart, Minus, Plus, Trash2, ArrowLeft, ArrowRight,
    Package, ShoppingBag, Store, MapPin
} from 'lucide-react';
import './Carrito.css';

function Carrito() {
    const navigate = useNavigate();
    const toast = useToast();

    const [grupos, setGrupos] = useState([]);
    const [resumen, setResumen] = useState({ totalTiendas: 0, totalItems: 0, granTotal: 0 });
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(null);

    const estaLogueado = () => !!sessionStorage.getItem('prodven_cli_token');

    const cargar = useCallback(async () => {
        if (!estaLogueado()) {
            toast.info('Inicia sesión para ver tu carrito.');
            setTimeout(() => navigate('/cuenta'), 600);
            return;
        }
        try {
            setCargando(true);
            const res = await marketplaceService.obtenerTodosLosCarritos();
            const data = res.data.data || {};
            setGrupos(data.carritos || []);
            setResumen(data.resumen || { totalTiendas: 0, totalItems: 0, granTotal: 0 });
        } catch {
            setGrupos([]);
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const cambiarCantidad = async (idEmpresa, idItem, nuevaCantidad) => {
        if (nuevaCantidad < 1) return;
        setActualizando(idItem);
        try {
            await marketplaceService.actualizarCantidad(idEmpresa, idItem, nuevaCantidad);
            await cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo actualizar la cantidad.');
        } finally {
            setActualizando(null);
        }
    };

    const quitar = async (idEmpresa, idItem) => {
        setActualizando(idItem);
        try {
            await marketplaceService.quitarDelCarrito(idEmpresa, idItem);
            toast.exito('Producto eliminado del carrito.');
            await cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo quitar el producto.');
        } finally {
            setActualizando(null);
        }
    };

    const vaciarTienda = async (idEmpresa) => {
        try {
            await marketplaceService.vaciarCarrito(idEmpresa);
            toast.exito('Carrito de la tienda vaciado.');
            await cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo vaciar.');
        }
    };

    if (cargando) {
        return (
            <div className="car">
                <MarketplaceHeader />
                <div className="car-cargando"><div className="car-spinner"></div><p>Cargando tu carrito...</p></div>
            </div>
        );
    }

    const vacio = grupos.length === 0;

    return (
        <div className="car">
            <MarketplaceHeader />

            <main className="car-main">
                <button className="car-volver" onClick={() => navigate('/marketplace')}>
                    <ArrowLeft size={18} /> Seguir comprando
                </button>

                <div className="car-cabecera">
                    <h1><ShoppingCart size={26} /> Mi carrito</h1>
                    {!vacio && (
                        <span className="car-resumen-chip">
                            {resumen.totalItems} producto(s) en {resumen.totalTiendas} tienda(s)
                        </span>
                    )}
                </div>

                {vacio ? (
                    <div className="car-vacio">
                        <ShoppingBag size={64} strokeWidth={1.2} />
                        <h3>Tu carrito está vacío</h3>
                        <p>Explora las tiendas y agrega productos para verlos aquí.</p>
                        <button className="car-btn-explorar" onClick={() => navigate('/marketplace')}>
                            Explorar tiendas <ArrowRight size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="car-contenido">
                        <div className="car-tiendas">
                            {grupos.map((grupo) => {
                                const t = grupo.tienda || {};
                                const idEmpresa = t.idEmpresa || grupo.carrito?.idEmpresa;
                                const inicial = (t.nombre || 'T')[0].toUpperCase();
                                return (
                                    <div className="car-tienda-bloque" key={grupo.carrito.idCarrito}>
                                        {/* Encabezado de la tienda */}
                                        <div className="car-tienda-cab">
                                            <div className="car-tienda-identidad">
                                                <div className="car-tienda-logo">
                                                    {t.logoUrl ? <img src={t.logoUrl} alt={t.nombre} /> : inicial}
                                                </div>
                                                <div>
                                                    <h2>{t.nombre || 'Tienda'}</h2>
                                                    {t.ciudad && <span className="car-tienda-ciudad"><MapPin size={12} /> {t.ciudad}</span>}
                                                </div>
                                            </div>
                                            <button className="car-tienda-visitar" onClick={() => navigate(`/tienda/${idEmpresa}`)}>
                                                <Store size={14} /> Ver tienda
                                            </button>
                                        </div>

                                        {/* Items de la tienda */}
                                        <div className="car-items">
                                            {grupo.items.map((it) => {
                                                const idItem = it.idItem || it.idItemCarrito || it.id;
                                                const nombre = it.nombreProducto || 'Producto';
                                                const precio = it.precioUnitario || it.precio || 0;
                                                const imagen = it.imagenProducto;
                                                const cant = it.cantidad || 1;
                                                const enProceso = actualizando === idItem;
                                                return (
                                                    <div className={`car-item ${enProceso ? 'car-item-procesando' : ''}`} key={idItem}>
                                                        <div className="car-item-img">
                                                            {imagen ? <img src={imagen} alt={nombre} /> : <div className="car-item-placeholder"><Package size={26} /></div>}
                                                        </div>
                                                        <div className="car-item-info">
                                                            <h3>{nombre}</h3>
                                                            <span className="car-item-precio-unit">{formatoMoneda(precio)} c/u</span>
                                                        </div>
                                                        <div className="car-item-cantidad">
                                                            <button onClick={() => cambiarCantidad(idEmpresa, idItem, cant - 1)} disabled={enProceso || cant <= 1}><Minus size={15} /></button>
                                                            <span>{cant}</span>
                                                            <button onClick={() => cambiarCantidad(idEmpresa, idItem, cant + 1)} disabled={enProceso}><Plus size={15} /></button>
                                                        </div>
                                                        <div className="car-item-subtotal">{formatoMoneda(precio * cant)}</div>
                                                        <button className="car-item-quitar" onClick={() => quitar(idEmpresa, idItem)} disabled={enProceso} title="Quitar">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Pie de la tienda: subtotal y continuar */}
                                        <div className="car-tienda-pie">
                                            <button className="car-tienda-vaciar" onClick={() => vaciarTienda(idEmpresa)}>Vaciar esta tienda</button>
                                            <div className="car-tienda-total">
                                                <span>Subtotal ({grupo.items.reduce((s, i) => s + (i.cantidad || 0), 0)} productos)</span>
                                                <strong>{formatoMoneda(grupo.carrito.total)}</strong>
                                            </div>
                                            <button className="car-tienda-pagar" onClick={() => navigate(`/checkout/${idEmpresa}`)}>
                                                Continuar compra <ArrowRight size={18} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Resumen global */}
                        <aside className="car-resumen">
                            <h2>Resumen general</h2>
                            <div className="car-resumen-linea">
                                <span>Tiendas</span>
                                <span>{resumen.totalTiendas}</span>
                            </div>
                            <div className="car-resumen-linea">
                                <span>Productos</span>
                                <span>{resumen.totalItems}</span>
                            </div>
                            <div className="car-resumen-total">
                                <span>Total general</span>
                                <span>{formatoMoneda(resumen.granTotal)}</span>
                            </div>
                            <p className="car-resumen-nota">
                                Cada tienda se paga por separado. Usa el botón "Continuar compra" de cada tienda para finalizar su pedido.
                            </p>
                        </aside>
                    </div>
                )}
            </main>

            <MarketplaceFooter />
        </div>
    );
}

export default Carrito;