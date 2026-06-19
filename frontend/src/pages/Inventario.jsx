import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import inventarioService from '../services/inventarioService';
import Modal from '../components/Modal';
import {
    Warehouse, Search, AlertTriangle, TrendingUp, TrendingDown,
    Package, History, Plus, Boxes, DollarSign
} from 'lucide-react';
import './Inventario.css';

function Inventario() {
    const { usuario } = useAuth();
    const toast = useToast();

    const [stock, setStock] = useState([]);
    const [resumen, setResumen] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [detalle, setDetalle] = useState(null);
    const [kardex, setKardex] = useState([]);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);

    const [modalMovimiento, setModalMovimiento] = useState(false);
    const [movForm, setMovForm] = useState({ idProducto: '', tipo: 'entrada', cantidad: '', motivo: '' });
    const [guardandoMov, setGuardandoMov] = useState(false);

    const idEmpresa = usuario?.idEmpresa;

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const params = busqueda ? { busqueda } : {};
            const [resStock, resResumen] = await Promise.all([
                inventarioService.listarStock(idEmpresa, params),
                inventarioService.resumen(idEmpresa).catch(() => null)
            ]);
            setStock(resStock.data.data?.stock || []);
            if (resResumen) setResumen(resResumen.data.data);
        } catch {
            toast.error('No se pudo cargar el inventario.');
        } finally {
            setCargando(false);
        }
    }, [idEmpresa, busqueda, toast]);

    useEffect(() => { cargar(); }, [cargar]);

    const verKardex = async (item) => {
        setDetalle(item);
        setCargandoDetalle(true);
        try {
            const res = await inventarioService.kardex(item.producto.idProducto, idEmpresa);
            setKardex(res.data.data?.movimientos || []);
        } catch {
            toast.error('No se pudo cargar el historial.');
            setKardex([]);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const abrirMovimiento = (item) => {
        setMovForm({ idProducto: item.producto.idProducto, tipo: 'entrada', cantidad: '', motivo: '' });
        setModalMovimiento(true);
    };

    const guardarMovimiento = async (e) => {
        e.preventDefault();
        if (!movForm.cantidad || parseFloat(movForm.cantidad) <= 0) {
            toast.error('Indica una cantidad válida.');
            return;
        }
        setGuardandoMov(true);
        try {
            await inventarioService.registrarMovimiento({
                idEmpresa,
                idProducto: movForm.idProducto,
                tipo: movForm.tipo,
                cantidad: parseFloat(movForm.cantidad),
                motivo: movForm.motivo || `Movimiento manual (${movForm.tipo})`
            });
            toast.exito('Movimiento registrado.');
            setModalMovimiento(false);
            cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo registrar el movimiento.');
        } finally {
            setGuardandoMov(false);
        }
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const formatoFecha = (f) => {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="inventario">
            <div className="inv-cabecera">
                <div>
                    <h1>Inventario</h1>
                    <p>Controla el stock de tus productos</p>
                </div>
            </div>

            {/* Tarjetas de resumen */}
            {resumen && (
                <div className="inv-tarjetas">
                    <div className="inv-tarjeta">
                        <div className="inv-tarjeta-icono inv-icono-azul"><Boxes size={22} /></div>
                        <div>
                            <span className="inv-tarjeta-valor">{resumen.totalProductos ?? stock.length}</span>
                            <span className="inv-tarjeta-label">Productos en stock</span>
                        </div>
                    </div>
                    <div className="inv-tarjeta">
                        <div className="inv-tarjeta-icono inv-icono-verde"><DollarSign size={22} /></div>
                        <div>
                            <span className="inv-tarjeta-valor">{formatoMoneda(resumen.valorTotalInventario)}</span>
                            <span className="inv-tarjeta-label">Valor del inventario</span>
                        </div>
                    </div>
                    <div className="inv-tarjeta">
                        <div className="inv-tarjeta-icono inv-icono-naranja"><AlertTriangle size={22} /></div>
                        <div>
                            <span className="inv-tarjeta-valor">{resumen.productosStockBajo ?? 0}</span>
                            <span className="inv-tarjeta-label">Con stock bajo</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Búsqueda */}
            <div className="inv-barra">
                <div className="inv-buscador">
                    <Search size={18} className="inv-buscador-icono" />
                    <input
                        type="text"
                        placeholder="Buscar producto por nombre o SKU..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {cargando ? (
                <div className="inv-cargando"><div className="inv-spinner"></div><p>Cargando inventario...</p></div>
            ) : stock.length === 0 ? (
                <div className="inv-vacio">
                    <Warehouse size={56} strokeWidth={1.3} />
                    <h3>Sin datos de inventario</h3>
                    <p>{busqueda ? 'No se encontraron productos.' : 'Aún no hay stock registrado.'}</p>
                </div>
            ) : (
                <div className="inv-tabla-contenedor">
                    <table className="inv-tabla">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Física</th>
                                <th>Reservada</th>
                                <th>Disponible</th>
                                <th className="inv-th-acciones">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stock.map((s, i) => {
                                const bajo = s.tieneStockBajo || (s.cantidadDisponible <= 0);
                                return (
                                    <tr key={i}>
                                        <td>
                                            <div className="inv-prod-celda">
                                                <div className="inv-mini-icono"><Package size={18} /></div>
                                                <div>
                                                    <span className="inv-prod-nombre">{s.producto?.nombre || 'Producto'}</span>
                                                    <span className="inv-prod-sku">{s.producto?.codigoSku || ''}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{s.cantidadFisica ?? '—'}</td>
                                        <td>{s.cantidadReservada ?? 0}</td>
                                        <td>
                                            <span className={`inv-disponible ${bajo ? 'inv-stock-bajo' : ''}`}>
                                                {s.cantidadDisponible ?? 0}
                                                {bajo && <AlertTriangle size={13} />}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="inv-acciones">
                                                <button className="inv-accion" title="Ver historial" onClick={() => verKardex(s)}>
                                                    <History size={16} />
                                                </button>
                                                <button className="inv-accion" title="Registrar movimiento" onClick={() => abrirMovimiento(s)}>
                                                    <Plus size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Modal de kardex (historial) */}
            <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)} titulo={`Historial: ${detalle?.producto?.nombre || ''}`} ancho="640px">
                {cargandoDetalle ? (
                    <div className="inv-detalle-cargando"><div className="inv-spinner"></div><p>Cargando historial...</p></div>
                ) : kardex.length === 0 ? (
                    <p className="inv-sin-movimientos">No hay movimientos registrados para este producto.</p>
                ) : (
                    <div className="inv-kardex">
                        {kardex.map((m, i) => {
                            const esEntrada = (m.tipo || '').includes('entrada') || m.cantidad > 0;
                            return (
                                <div className="inv-kardex-item" key={i}>
                                    <div className={`inv-kardex-icono ${esEntrada ? 'inv-entrada' : 'inv-salida'}`}>
                                        {esEntrada ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                                    </div>
                                    <div className="inv-kardex-info">
                                        <span className="inv-kardex-tipo">{m.tipo || (esEntrada ? 'Entrada' : 'Salida')}</span>
                                        <span className="inv-kardex-motivo">{m.motivo || m.descripcion || 'Sin descripción'}</span>
                                    </div>
                                    <div className="inv-kardex-derecha">
                                        <span className={`inv-kardex-cantidad ${esEntrada ? 'inv-entrada-txt' : 'inv-salida-txt'}`}>
                                            {esEntrada ? '+' : '-'}{Math.abs(m.cantidad)}
                                        </span>
                                        <span className="inv-kardex-fecha">{formatoFecha(m.fechaCreacion || m.fecha)}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </Modal>

            {/* Modal de registrar movimiento */}
            <Modal abierto={modalMovimiento} onCerrar={() => setModalMovimiento(false)} titulo="Registrar movimiento" ancho="480px">
                <form className="inv-form" onSubmit={guardarMovimiento}>
                    <div className="inv-form-campo">
                        <label>Tipo de movimiento</label>
                        <div className="inv-tipo-selector">
                            <button
                                type="button"
                                className={`inv-tipo-btn ${movForm.tipo === 'entrada' ? 'inv-tipo-activo-entrada' : ''}`}
                                onClick={() => setMovForm((p) => ({ ...p, tipo: 'entrada' }))}
                            >
                                <TrendingUp size={16} /> Entrada
                            </button>
                            <button
                                type="button"
                                className={`inv-tipo-btn ${movForm.tipo === 'salida' ? 'inv-tipo-activo-salida' : ''}`}
                                onClick={() => setMovForm((p) => ({ ...p, tipo: 'salida' }))}
                            >
                                <TrendingDown size={16} /> Salida
                            </button>
                        </div>
                    </div>
                    <div className="inv-form-campo">
                        <label>Cantidad</label>
                        <input type="number" value={movForm.cantidad} onChange={(e) => setMovForm((p) => ({ ...p, cantidad: e.target.value }))} placeholder="0" min="0" step="any" />
                    </div>
                    <div className="inv-form-campo">
                        <label>Motivo</label>
                        <input type="text" value={movForm.motivo} onChange={(e) => setMovForm((p) => ({ ...p, motivo: e.target.value }))} placeholder="Ej: Compra a proveedor, merma, etc." />
                    </div>
                    <div className="inv-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalMovimiento(false)}>Cancelar</button>
                        <button type="submit" className="btn-primario" disabled={guardandoMov}>
                            {guardandoMov ? 'Registrando...' : 'Registrar movimiento'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Inventario;