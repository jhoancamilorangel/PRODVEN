import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import marketplaceService from '../services/marketplaceService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    ShoppingCart, Minus, Plus, Trash2, ArrowLeft,
    ArrowRight, Package, ShoppingBag, Store
} from 'lucide-react';
import './Carrito.css';

function Carrito() {
    const { idEmpresa } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [carrito, setCarrito] = useState(null);
    const [tienda, setTienda] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [actualizando, setActualizando] = useState(null); // idItem en proceso

    const estaLogueado = () => !!localStorage.getItem('prodven_token');

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        if (!estaLogueado()) {
            toast.info('Inicia sesión para ver tu carrito.');
            setTimeout(() => navigate('/cuenta'), 600);
            return;
        }
        try {
            setCargando(true);
            const [resCarrito, resTienda] = await Promise.all([
                marketplaceService.obtenerCarrito(idEmpresa).catch(() => null),
                marketplaceService.obtenerTienda(idEmpresa).catch(() => null)
            ]);
            if (resCarrito) {
                setCarrito(resCarrito.data.data || null);
            }
            if (resTienda) {
                setTienda(resTienda.data.data?.empresa || resTienda.data.data || null);
            }
        } catch {
            setCarrito(null);
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    useEffect(() => { cargar(); }, [cargar]);

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    // Normaliza los items del carrito (el backend puede devolverlos con distintos nombres)
    const items = carrito?.items || carrito?.itemsCarrito || [];

    const cambiarCantidad = async (idItem, nuevaCantidad) => {
        if (nuevaCantidad < 1) return;
        setActualizando(idItem);
        try {
            const res = await marketplaceService.actualizarCantidad(idEmpresa, idItem, nuevaCantidad);
            setCarrito(res.data.data || carrito);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo actualizar la cantidad.');
        } finally {
            setActualizando(null);
        }
    };

    const quitar = async (idItem) => {
        setActualizando(idItem);
        try {
            const res = await marketplaceService.quitarDelCarrito(idEmpresa, idItem);
            setCarrito(res.data.data || { items: [] });
            toast.exito('Producto eliminado del carrito.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo quitar el producto.');
        } finally {
            setActualizando(null);
        }
    };

    const vaciar = async () => {
        try {
            await marketplaceService.vaciarCarrito(idEmpresa);
            setCarrito({ items: [] });
            toast.exito('Carrito vaciado.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo vaciar el carrito.');
        }
    };

    // Cálculo de totales
    const subtotal = items.reduce((sum, it) => {
        const precio = it.precioUnitario || it.precio || it.producto?.precioVenta || 0;
        const cant = it.cantidad || 0;
        return sum + (precio * cant);
    }, 0);

    const totalItems = items.reduce((sum, it) => sum + (it.cantidad || 0), 0);

    if (cargando) {
        return (
            <div className="car">
                <MarketplaceHeader />
                <div className="car-cargando"><div className="car-spinner"></div><p>Cargando tu carrito...</p></div>
            </div>
        );
    }

    return (
        <div className="car">
            <MarketplaceHeader />

            <main className="car-main">
                <button className="car-volver" onClick={() => navigate(`/tienda/${idEmpresa}`)}>
                    <ArrowLeft size={18} /> Seguir comprando
                </button>

                <div className="car-cabecera">
                    <h1><ShoppingCart size={26} /> Tu carrito</h1>
                    {tienda && (
                        <span className="car-tienda-nombre"><Store size={15} /> {tienda.nombre}</span>
                    )}
                </div>

                {items.length === 0 ? (
                    <div className="car-vacio">
                        <ShoppingBag size={64} strokeWidth={1.2} />
                        <h3>Tu carrito está vacío</h3>
                        <p>Agrega productos desde la tienda para verlos aquí.</p>
                        <button className="car-btn-explorar" onClick={() => navigate(`/tienda/${idEmpresa}`)}>
                            Explorar tienda <ArrowRight size={16} />
                        </button>
                    </div>
                ) : (
                    <div className="car-contenido">
                        {/* Lista de items */}
                        <div className="car-items">
                            {items.map((it) => {
                                const idItem = it.idItem || it.idItemCarrito || it.id;
                                const nombre = it.nombreProducto || it.producto?.nombre || it.nombre || 'Producto';
                                const precio = it.precioUnitario || it.precio || it.producto?.precioVenta || 0;
                                const imagen = it.imagenProducto || it.producto?.imagenPrincipal || it.imagenUrl;
                                const cant = it.cantidad || 1;
                                const enProceso = actualizando === idItem;
                                return (
                                    <div className={`car-item ${enProceso ? 'car-item-procesando' : ''}`} key={idItem}>
                                        <div className="car-item-img">
                                            {imagen ? <img src={imagen} alt={nombre} /> : <div className="car-item-placeholder"><Package size={28} /></div>}
                                        </div>
                                        <div className="car-item-info">
                                            <h3>{nombre}</h3>
                                            <span className="car-item-precio-unit">{formatoMoneda(precio)} c/u</span>
                                        </div>
                                        <div className="car-item-cantidad">
                                            <button onClick={() => cambiarCantidad(idItem, cant - 1)} disabled={enProceso || cant <= 1}><Minus size={15} /></button>
                                            <span>{cant}</span>
                                            <button onClick={() => cambiarCantidad(idItem, cant + 1)} disabled={enProceso}><Plus size={15} /></button>
                                        </div>
                                        <div className="car-item-subtotal">{formatoMoneda(precio * cant)}</div>
                                        <button className="car-item-quitar" onClick={() => quitar(idItem)} disabled={enProceso} title="Quitar">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                );
                            })}
                            <button className="car-vaciar" onClick={vaciar}>Vaciar carrito</button>
                        </div>

                        {/* Resumen */}
                        <aside className="car-resumen">
                            <h2>Resumen</h2>
                            <div className="car-resumen-linea">
                                <span>Productos ({totalItems})</span>
                                <span>{formatoMoneda(subtotal)}</span>
                            </div>
                            <div className="car-resumen-linea car-resumen-envio">
                                <span>Envío</span>
                                <span>Se calcula al pagar</span>
                            </div>
                            <div className="car-resumen-total">
                                <span>Total</span>
                                <span>{formatoMoneda(subtotal)}</span>
                            </div>
                            <button className="car-btn-pagar" onClick={() => navigate(`/checkout/${idEmpresa}`)}>
                                Continuar al pago <ArrowRight size={18} />
                            </button>
                            <p className="car-resumen-nota">Los impuestos y el envío se calculan en el siguiente paso.</p>
                        </aside>
                    </div>
                )}
            </main>

            <MarketplaceFooter />
        </div>
    );
}

export default Carrito;