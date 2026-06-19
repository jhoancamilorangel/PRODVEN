import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import pedidoService from '../services/pedidoService';
import Modal from '../components/Modal';
import {
    ShoppingCart, Eye, Package, Clock, CheckCircle, XCircle,
    Truck, ChefHat, RotateCcw, MapPin, CreditCard
} from 'lucide-react';
import './Pedidos.css';

// Configuración visual de cada estado
const ESTADOS = {
    pendiente:      { etiqueta: 'Pendiente',      color: '#f39c12', icono: Clock },
    confirmado:     { etiqueta: 'Confirmado',     color: '#3498db', icono: CheckCircle },
    en_preparacion: { etiqueta: 'En preparación', color: '#9b59b6', icono: ChefHat },
    en_camino:      { etiqueta: 'En camino',      color: '#1abc9c', icono: Truck },
    entregado:      { etiqueta: 'Entregado',      color: '#27AE60', icono: Package },
    cancelado:      { etiqueta: 'Cancelado',      color: '#e74c3c', icono: XCircle },
    reembolsado:    { etiqueta: 'Reembolsado',    color: '#95a5a6', icono: RotateCcw }
};

// Transiciones permitidas (igual que el backend)
const TRANSICIONES = {
    pendiente: ['confirmado', 'cancelado'],
    confirmado: ['en_preparacion', 'cancelado'],
    en_preparacion: ['en_camino', 'cancelado'],
    en_camino: ['entregado', 'cancelado'],
    entregado: [],
    cancelado: [],
    reembolsado: []
};

const FILTROS = ['todos', 'pendiente', 'confirmado', 'en_preparacion', 'en_camino', 'entregado', 'cancelado'];

function Pedidos() {
    const { usuario } = useAuth();
    const toast = useToast();

    const [pedidos, setPedidos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState('todos');

    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [cambiandoEstado, setCambiandoEstado] = useState(false);

    const idEmpresa = usuario?.idEmpresa;

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const params = filtro !== 'todos' ? { estado: filtro } : {};
            const res = await pedidoService.listar(idEmpresa, params);
            setPedidos(res.data.data?.pedidos || []);
        } catch {
            toast.error('No se pudieron cargar los pedidos.');
        } finally {
            setCargando(false);
        }
    }, [idEmpresa, filtro, toast]);

    useEffect(() => { cargar(); }, [cargar]);

    const verDetalle = async (idPedido) => {
        setCargandoDetalle(true);
        setDetalle({ cargando: true });
        try {
            const res = await pedidoService.obtener(idPedido, idEmpresa);
            setDetalle(res.data.data);
        } catch {
            toast.error('No se pudo cargar el detalle del pedido.');
            setDetalle(null);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const cambiarEstado = async (idPedido, nuevoEstado) => {
        setCambiandoEstado(true);
        try {
            await pedidoService.cambiarEstado(idPedido, idEmpresa, nuevoEstado);
            toast.exito(`Pedido actualizado a "${ESTADOS[nuevoEstado]?.etiqueta || nuevoEstado}".`);
            await verDetalle(idPedido);
            cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cambiar el estado.');
        } finally {
            setCambiandoEstado(false);
        }
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const formatoFecha = (f) => {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    // Datos del pedido en detalle (puede venir como pedido directo o anidado)
    const ped = detalle && !detalle.cargando ? (detalle.pedido || detalle) : null;
    const items = ped?.items || ped?.detalles || [];
    const estadoActual = ped?.estado;
    const siguientesEstados = estadoActual ? (TRANSICIONES[estadoActual] || []) : [];

    return (
        <div className="pedidos">
            <div className="ped-cabecera">
                <div>
                    <h1>Pedidos</h1>
                    <p>Gestiona los pedidos de tu negocio</p>
                </div>
            </div>

            {/* Filtros por estado */}
            <div className="ped-filtros">
                {FILTROS.map((f) => (
                    <button
                        key={f}
                        className={`ped-filtro ${filtro === f ? 'ped-filtro-activo' : ''}`}
                        onClick={() => setFiltro(f)}
                    >
                        {f === 'todos' ? 'Todos' : ESTADOS[f]?.etiqueta || f}
                    </button>
                ))}
            </div>

            {cargando ? (
                <div className="ped-cargando"><div className="ped-spinner"></div><p>Cargando pedidos...</p></div>
            ) : pedidos.length === 0 ? (
                <div className="ped-vacio">
                    <ShoppingCart size={56} strokeWidth={1.3} />
                    <h3>No hay pedidos</h3>
                    <p>{filtro !== 'todos' ? 'No hay pedidos en este estado.' : 'Aún no se han registrado pedidos.'}</p>
                </div>
            ) : (
                <div className="ped-lista">
                    {pedidos.map((p) => {
                        const est = ESTADOS[p.estado] || {};
                        const Icono = est.icono || Package;
                        return (
                            <div className="ped-tarjeta" key={p.idPedido} onClick={() => verDetalle(p.idPedido)}>
                                <div className="ped-tarjeta-izq">
                                    <div className="ped-tarjeta-icono" style={{ background: est.color }}>
                                        <Icono size={20} />
                                    </div>
                                    <div>
                                        <span className="ped-numero">{p.numeroPedido || `Pedido ${p.idPedido?.slice(0, 8)}`}</span>
                                        <span className="ped-fecha">{formatoFecha(p.fechaPedido)}</span>
                                    </div>
                                </div>
                                <div className="ped-tarjeta-der">
                                    <span className="ped-total">{formatoMoneda(p.total)}</span>
                                    <span className="ped-estado-badge" style={{ background: `${est.color}1a`, color: est.color }}>
                                        {est.etiqueta || p.estado}
                                    </span>
                                    <button className="ped-ver-btn"><Eye size={16} /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Modal de detalle */}
            <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)} titulo="Detalle del pedido" ancho="640px">
                {cargandoDetalle || detalle?.cargando ? (
                    <div className="ped-detalle-cargando"><div className="ped-spinner"></div><p>Cargando...</p></div>
                ) : ped ? (
                    <div className="ped-detalle">
                        {/* Cabecera del detalle */}
                        <div className="ped-detalle-cabecera">
                            <div>
                                <span className="ped-detalle-numero">{ped.numeroPedido || 'Pedido'}</span>
                                <span className="ped-detalle-fecha">{formatoFecha(ped.fechaPedido)}</span>
                            </div>
                            <span className="ped-estado-badge" style={{
                                background: `${ESTADOS[estadoActual]?.color || '#999'}1a`,
                                color: ESTADOS[estadoActual]?.color || '#999'
                            }}>
                                {ESTADOS[estadoActual]?.etiqueta || estadoActual}
                            </span>
                        </div>

                        {/* Info de entrega y pago */}
                        <div className="ped-detalle-info">
                            <div className="ped-info-item">
                                <MapPin size={16} />
                                <span>{ped.tipoEntrega || 'No especificado'}</span>
                            </div>
                            <div className="ped-info-item">
                                <CreditCard size={16} />
                                <span>{ped.tipoPago || 'No especificado'}</span>
                            </div>
                        </div>

                        {/* Items del pedido */}
                        <div className="ped-detalle-items">
                            <h3>Productos</h3>
                            {items.length === 0 ? (
                                <p className="ped-sin-items">No hay detalle de productos disponible.</p>
                            ) : (
                                items.map((it, i) => (
                                    <div className="ped-item" key={i}>
                                        <span className="ped-item-nombre">{it.nombreProducto || it.nombre || `Producto ${i + 1}`}</span>
                                        <span className="ped-item-cant">x{it.cantidad}</span>
                                        <span className="ped-item-precio">{formatoMoneda(it.subtotal || it.precioUnitario)}</span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Totales */}
                        <div className="ped-detalle-totales">
                            <div className="ped-total-linea">
                                <span>Subtotal</span>
                                <span>{formatoMoneda(ped.subtotal)}</span>
                            </div>
                            {ped.descuento > 0 && (
                                <div className="ped-total-linea">
                                    <span>Descuento</span>
                                    <span>- {formatoMoneda(ped.descuento)}</span>
                                </div>
                            )}
                            {ped.costoDomicilio > 0 && (
                                <div className="ped-total-linea">
                                    <span>Domicilio</span>
                                    <span>{formatoMoneda(ped.costoDomicilio)}</span>
                                </div>
                            )}
                            <div className="ped-total-linea ped-total-final">
                                <span>Total</span>
                                <span>{formatoMoneda(ped.total)}</span>
                            </div>
                        </div>

                        {/* Acciones de cambio de estado */}
                        {siguientesEstados.length > 0 && (
                            <div className="ped-detalle-acciones">
                                <h3>Cambiar estado</h3>
                                <div className="ped-acciones-botones">
                                    {siguientesEstados.map((est) => {
                                        const config = ESTADOS[est];
                                        const Icono = config?.icono || Package;
                                        const esCancelar = est === 'cancelado';
                                        return (
                                            <button
                                                key={est}
                                                className={`ped-accion-estado ${esCancelar ? 'ped-accion-cancelar' : ''}`}
                                                style={!esCancelar ? { background: config?.color } : {}}
                                                onClick={() => cambiarEstado(ped.idPedido, est)}
                                                disabled={cambiandoEstado}
                                            >
                                                <Icono size={16} />
                                                {config?.etiqueta || est}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <p>No se pudo cargar el pedido.</p>
                )}
            </Modal>
        </div>
    );
}

export default Pedidos;