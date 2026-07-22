import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import marketplaceService from '../services/marketplaceService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    ArrowLeft, Package, ShoppingBag, ChevronRight, X, Clock,
    CheckCircle2, ChefHat, Truck, PackageCheck, XCircle, MapPin, Store, Loader2
} from 'lucide-react';
import './MisCompras.css';

// Orden y presentación de los estados del pedido
const FLUJO_ESTADOS = ['pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado'];
const INFO_ESTADO = {
    pendiente:      { etiqueta: 'Pendiente',      icono: Clock,        color: '#e67e22' },
    confirmado:     { etiqueta: 'Confirmado',     icono: CheckCircle2, color: '#2980b9' },
    en_preparacion: { etiqueta: 'En preparación', icono: ChefHat,      color: '#8e44ad' },
    en_camino:      { etiqueta: 'En camino',      icono: Truck,        color: '#16a085' },
    entregado:      { etiqueta: 'Entregado',      icono: PackageCheck, color: '#27AE60' },
    cancelado:      { etiqueta: 'Cancelado',      icono: XCircle,      color: '#e74c3c' },
    reembolsado:    { etiqueta: 'Reembolsado',    icono: XCircle,      color: '#95a5a6' }
};

function MisCompras() {
    const navigate = useNavigate();
    const toast = useToast();

    const [cargando, setCargando] = useState(true);
    const [pedidos, setPedidos] = useState([]);
    const [seleccionado, setSeleccionado] = useState(null);
    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [cancelando, setCancelando] = useState(false);

    const estaLogueado = () => !!sessionStorage.getItem('prodven_cli_token');

    const cargar = useCallback(async () => {
        if (!estaLogueado()) {
            toast.info('Inicia sesión para ver tus compras.');
            setTimeout(() => navigate('/cuenta'), 600);
            return;
        }
        try {
            setCargando(true);
            const res = await marketplaceService.misCompras();
            const data = res.data.data?.pedidos || res.data.data || [];
            setPedidos(Array.isArray(data) ? data : []);
        } catch {
            setPedidos([]);
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const formatoFecha = (f) => {
        if (!f) return '';
        try {
            return new Date(f).toLocaleDateString('es-CO', {
                day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
            });
        } catch { return ''; }
    };

    const abrirDetalle = async (pedido) => {
        setSeleccionado(pedido);
        setDetalle(null);
        setCargandoDetalle(true);
        try {
            const res = await marketplaceService.detalleMiCompra(pedido.idPedido);
            setDetalle(res.data.data);
        } catch {
            toast.error('No se pudo cargar el detalle del pedido.');
            setSeleccionado(null);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const cerrarDetalle = () => {
        setSeleccionado(null);
        setDetalle(null);
    };

    const cancelarPedido = async () => {
        if (!seleccionado) return;
        setCancelando(true);
        try {
            await marketplaceService.cancelarPedido
                ? await marketplaceService.cancelarPedido(seleccionado.idPedido)
                : await import('../services/api').then(({ default: api }) =>
                    api.post(`/pedidos/${seleccionado.idPedido}/cancelar`, { motivo: 'Cancelado por el cliente' }));
            toast.exito('Pedido cancelado.');
            cerrarDetalle();
            await cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cancelar el pedido.');
        } finally {
            setCancelando(false);
        }
    };

    const infoEstado = (estado) => INFO_ESTADO[estado] || INFO_ESTADO.pendiente;
    const esCancelable = (estado) => ['pendiente', 'confirmado', 'en_preparacion'].includes(estado);

    if (cargando) {
        return (
            <div className="mcp">
                <MarketplaceHeader />
                <div className="mcp-cargando"><div className="mcp-spinner"></div><p>Cargando tus compras...</p></div>
            </div>
        );
    }

    return (
        <div className="mcp">
            <MarketplaceHeader />

            <main className="mcp-main">
                <button className="mcp-volver" onClick={() => navigate('/marketplace')}>
                    <ArrowLeft size={18} /> Volver al marketplace
                </button>

                <div className="mcp-cabecera">
                    <h1><ShoppingBag size={26} /> Mis compras</h1>
                    {pedidos.length > 0 && <span className="mcp-chip">{pedidos.length} pedido(s)</span>}
                </div>

                {pedidos.length === 0 ? (
                    <div className="mcp-vacio">
                        <ShoppingBag size={64} strokeWidth={1.2} />
                        <h3>Aún no tienes compras</h3>
                        <p>Cuando hagas tu primer pedido, aparecerá aquí con su seguimiento.</p>
                        <button className="mcp-btn-primario" onClick={() => navigate('/marketplace')}>
                            Explorar tiendas
                        </button>
                    </div>
                ) : (
                    <div className="mcp-lista">
                        {pedidos.map((p, i) => {
                            const est = infoEstado(p.estado);
                            const Icono = est.icono;
                            return (
                                <button
                                    className="mcp-pedido"
                                    key={p.idPedido}
                                    onClick={() => abrirDetalle(p)}
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                >
                                    <div className="mcp-pedido-icono" style={{ background: `${est.color}15`, color: est.color }}>
                                        <Icono size={22} />
                                    </div>
                                    <div className="mcp-pedido-info">
                                        <div className="mcp-pedido-top">
                                            <span className="mcp-pedido-numero">{p.numeroPedido}</span>
                                            <span className="mcp-pedido-estado" style={{ color: est.color, background: `${est.color}15` }}>
                                                {est.etiqueta}
                                            </span>
                                        </div>
                                        <span className="mcp-pedido-fecha">{formatoFecha(p.fechaPedido)}</span>
                                    </div>
                                    <div className="mcp-pedido-derecha">
                                        <span className="mcp-pedido-total">{formatoMoneda(p.total)}</span>
                                        <ChevronRight size={18} className="mcp-pedido-flecha" />
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* ===== PANEL DE DETALLE ===== */}
            {seleccionado && (
                <div className="mcp-overlay" onClick={cerrarDetalle}>
                    <div className="mcp-panel" onClick={(e) => e.stopPropagation()}>
                        <div className="mcp-panel-cab">
                            <div>
                                <span className="mcp-panel-numero">{seleccionado.numeroPedido}</span>
                                <span className="mcp-panel-fecha">{formatoFecha(seleccionado.fechaPedido)}</span>
                            </div>
                            <button className="mcp-panel-cerrar" onClick={cerrarDetalle}><X size={20} /></button>
                        </div>

                        {cargandoDetalle ? (
                            <div className="mcp-panel-cargando">
                                <Loader2 size={28} className="mcp-girando" />
                                <p>Cargando detalle...</p>
                            </div>
                        ) : detalle ? (
                            <div className="mcp-panel-cuerpo">
                                {/* Línea de tiempo del seguimiento */}
                                <section className="mcp-bloque">
                                    <h3>Seguimiento</h3>
                                    <div className="mcp-timeline">
                                        {(() => {
                                            const p = detalle.pedido;
                                            const cancelado = ['cancelado', 'reembolsado'].includes(p.estado);
                                            if (cancelado) {
                                                const est = infoEstado(p.estado);
                                                const IconoC = est.icono;
                                                return (
                                                    <div className="mcp-timeline-cancelado">
                                                        <div className="mcp-tl-icono-cancel"><IconoC size={20} /></div>
                                                        <div>
                                                            <strong>{est.etiqueta}</strong>
                                                            <p>Este pedido fue {est.etiqueta.toLowerCase()}.</p>
                                                        </div>
                                                    </div>
                                                );
                                            }
                                            const idxActual = FLUJO_ESTADOS.indexOf(p.estado);
                                            return FLUJO_ESTADOS.map((estado, idx) => {
                                                const info = INFO_ESTADO[estado];
                                                const IconoE = info.icono;
                                                const completado = idx <= idxActual;
                                                const actual = idx === idxActual;
                                                // Buscar la fecha real de este estado en el seguimiento
                                                const evento = (detalle.seguimiento || []).find((s) => s.estado === estado);
                                                return (
                                                    <div className={`mcp-tl-item ${completado ? 'mcp-tl-completado' : ''} ${actual ? 'mcp-tl-actual' : ''}`} key={estado}>
                                                        <div className="mcp-tl-linea">
                                                            <div className="mcp-tl-punto" style={completado ? { background: info.color, borderColor: info.color } : {}}>
                                                                {completado && <IconoE size={13} />}
                                                            </div>
                                                            {idx < FLUJO_ESTADOS.length - 1 &&
                                                                <div className="mcp-tl-barra" style={idx < idxActual ? { background: info.color } : {}}></div>}
                                                        </div>
                                                        <div className="mcp-tl-texto">
                                                            <strong>{info.etiqueta}</strong>
                                                            {evento && <span>{formatoFecha(evento.fecha)}</span>}
                                                            {actual && !evento && <span>En curso</span>}
                                                        </div>
                                                    </div>
                                                );
                                            });
                                        })()}
                                    </div>
                                </section>

                                {/* Productos */}
                                <section className="mcp-bloque">
                                    <h3>Productos</h3>
                                    <div className="mcp-productos">
                                        {(detalle.detalles || []).map((d) => (
                                            <div className="mcp-producto" key={d.idDetalle}>
                                                <div className="mcp-producto-cant">{d.cantidad}×</div>
                                                <span className="mcp-producto-nombre">{d.producto?.nombre || 'Producto'}</span>
                                                <span className="mcp-producto-precio">{formatoMoneda(d.subtotal)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                {/* Totales y entrega */}
                                <section className="mcp-bloque">
                                    <div className="mcp-totales">
                                        <div className="mcp-total-linea"><span>Subtotal</span><span>{formatoMoneda(detalle.pedido.subtotal)}</span></div>
                                        {detalle.pedido.costoDomicilio > 0 &&
                                            <div className="mcp-total-linea"><span>Domicilio</span><span>{formatoMoneda(detalle.pedido.costoDomicilio)}</span></div>}
                                        {detalle.pedido.impuestos > 0 &&
                                            <div className="mcp-total-linea"><span>Impuestos</span><span>{formatoMoneda(detalle.pedido.impuestos)}</span></div>}
                                        <div className="mcp-total-final"><span>Total</span><span>{formatoMoneda(detalle.pedido.total)}</span></div>
                                    </div>
                                    <div className="mcp-entrega">
                                        <div className="mcp-entrega-item">
                                            {detalle.pedido.tipoEntrega === 'domicilio' ? <MapPin size={15} /> : <Store size={15} />}
                                            <span>{detalle.pedido.tipoEntrega === 'domicilio' ? 'Domicilio' : 'Recoger en tienda'}</span>
                                        </div>
                                        {detalle.pedido.direccionEnvio &&
                                            <p className="mcp-entrega-dir">{detalle.pedido.direccionEnvio}</p>}
                                        {detalle.pedido.notas &&
                                            <p className="mcp-entrega-notas">"{detalle.pedido.notas}"</p>}
                                    </div>
                                </section>

                                {/* Acción de cancelar */}
                                {esCancelable(detalle.pedido.estado) && (
                                    <button className="mcp-cancelar" onClick={cancelarPedido} disabled={cancelando}>
                                        {cancelando ? (<><Loader2 size={16} className="mcp-girando" /> Cancelando...</>) : 'Cancelar pedido'}
                                    </button>
                                )}
                            </div>
                        ) : null}
                    </div>
                </div>
            )}

            <MarketplaceFooter />
        </div>
    );
}

export default MisCompras;