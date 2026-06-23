import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import invInternoService from '../services/invInternoService';
import InventarioArticuloDetalle from './InventarioArticuloDetalle';
import {
    Boxes, Plus, Search, Package, AlertTriangle, LayoutDashboard,
    List, ArrowDownUp, X, DollarSign, Layers, ArrowLeft
} from 'lucide-react';
import './InventarioInterno.css';

function InventarioInterno() {
    const navigate = useNavigate();
    const toast = useToast();

    const [pestana, setPestana] = useState('resumen');
    const [resumen, setResumen] = useState(null);
    const [articulos, setArticulos] = useState([]);
    const [cargandoResumen, setCargandoResumen] = useState(true);
    const [cargandoArticulos, setCargandoArticulos] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [modalArticulo, setModalArticulo] = useState(false);
    const [detalleId, setDetalleId] = useState(null); // artículo abierto en el detalle

    const cargarResumen = useCallback(async () => {
        try {
            setCargandoResumen(true);
            const res = await invInternoService.obtenerResumen();
            setResumen(res.data.data || null);
        } catch {
            setResumen(null);
        } finally {
            setCargandoResumen(false);
        }
    }, []);

    const cargarArticulos = useCallback(async (texto = '') => {
        try {
            setCargandoArticulos(true);
            const params = texto ? { busqueda: texto } : {};
            const res = await invInternoService.listarArticulos(params);
            const datos = res.data.data?.articulos || [];
            setArticulos(Array.isArray(datos) ? datos : []);
        } catch {
            setArticulos([]);
        } finally {
            setCargandoArticulos(false);
        }
    }, []);

    useEffect(() => { cargarResumen(); cargarArticulos(); }, [cargarResumen, cargarArticulos]);

    const buscar = (e) => {
        e.preventDefault();
        cargarArticulos(busqueda);
    };

    const refrescar = () => { cargarResumen(); cargarArticulos(busqueda); };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
    const formatoNumero = (v) =>
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(v || 0);

    const estadoStock = (art) => {
        const fisica = parseFloat(art.cantidadFisica ?? 0);
        const minimo = parseFloat(art.stockMinimo ?? 0);
        if (fisica <= 0) return 'agotado';
        if (minimo > 0 && fisica <= minimo) return 'bajo';
        return 'sano';
    };

    const PESTANAS = [
        { id: 'resumen', etiqueta: 'Resumen', icono: LayoutDashboard },
        { id: 'articulos', etiqueta: 'Artículos', icono: List },
        { id: 'movimientos', etiqueta: 'Movimientos', icono: ArrowDownUp }
    ];

    // Si hay un artículo abierto, mostramos su pantalla de detalle (reemplaza la vista)
    if (detalleId) {
        return (
            <InventarioArticuloDetalle
                idArticulo={detalleId}
                onVolver={() => setDetalleId(null)}
                onCambio={refrescar}
            />
        );
    }

    return (
        <div className="ii">
            {/* CABECERA DISTINTIVA (otro mundo) */}
            <div className="ii-hero">
                <div className="ii-hero-fondo"></div>
                <button className="ii-volver" onClick={() => navigate('/dashboard')}>
                    <ArrowLeft size={18} /> Volver al panel
                </button>
                <div className="ii-hero-contenido">
                    <div className="ii-hero-icono"><Boxes size={32} /></div>
                    <div>
                        <h1>Control de Inventario</h1>
                        <p>Tu inventario interno, independiente y completo</p>
                    </div>
                </div>
            </div>

            {/* PESTAÑAS */}
            <div className="ii-pestanas">
                {PESTANAS.map((p) => {
                    const Icono = p.icono;
                    return (
                        <button
                            key={p.id}
                            className={`ii-pestana ${pestana === p.id ? 'ii-pestana-activa' : ''}`}
                            onClick={() => setPestana(p.id)}
                        >
                            <Icono size={18} /> {p.etiqueta}
                        </button>
                    );
                })}
            </div>

            {/* ===== PESTAÑA RESUMEN ===== */}
            {pestana === 'resumen' && (
                <div className="ii-resumen">
                    {cargandoResumen ? (
                        <div className="ii-cargando"><div className="ii-spinner"></div><p>Cargando resumen...</p></div>
                    ) : (
                        <>
                            <div className="ii-tarjetas">
                                <div className="ii-tarjeta ii-tarjeta-valor">
                                    <div className="ii-tarjeta-icono"><DollarSign size={24} /></div>
                                    <div className="ii-tarjeta-info">
                                        <span className="ii-tarjeta-label">Valor del inventario</span>
                                        <span className="ii-tarjeta-numero">{formatoMoneda(resumen?.valorTotalInventario)}</span>
                                    </div>
                                </div>
                                <div className="ii-tarjeta">
                                    <div className="ii-tarjeta-icono ii-icono-azul"><Package size={24} /></div>
                                    <div className="ii-tarjeta-info">
                                        <span className="ii-tarjeta-label">Artículos</span>
                                        <span className="ii-tarjeta-numero">{resumen?.totalArticulos ?? 0}</span>
                                    </div>
                                </div>
                                <div className="ii-tarjeta">
                                    <div className="ii-tarjeta-icono ii-icono-verde"><Layers size={24} /></div>
                                    <div className="ii-tarjeta-info">
                                        <span className="ii-tarjeta-label">Unidades totales</span>
                                        <span className="ii-tarjeta-numero">{formatoNumero(resumen?.unidadesTotales)}</span>
                                    </div>
                                </div>
                                <div className={`ii-tarjeta ${resumen?.articulosStockBajo > 0 ? 'ii-tarjeta-alerta' : ''}`}>
                                    <div className="ii-tarjeta-icono ii-icono-ambar"><AlertTriangle size={24} /></div>
                                    <div className="ii-tarjeta-info">
                                        <span className="ii-tarjeta-label">Stock bajo</span>
                                        <span className="ii-tarjeta-numero">{resumen?.articulosStockBajo ?? 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="ii-accesos">
                                <button className="ii-acceso" onClick={() => setModalArticulo(true)}>
                                    <Plus size={20} /> <span>Nuevo artículo</span>
                                </button>
                                <button className="ii-acceso" onClick={() => setPestana('articulos')}>
                                    <List size={20} /> <span>Ver artículos</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ===== PESTAÑA ARTÍCULOS ===== */}
            {pestana === 'articulos' && (
                <div className="ii-panel">
                    <div className="ii-panel-barra">
                        <form className="ii-buscador" onSubmit={buscar}>
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre, código o código de barras..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </form>
                        <button className="ii-btn-primario" onClick={() => setModalArticulo(true)}>
                            <Plus size={18} /> Nuevo artículo
                        </button>
                    </div>

                    {cargandoArticulos ? (
                        <div className="ii-cargando"><div className="ii-spinner"></div><p>Cargando artículos...</p></div>
                    ) : articulos.length === 0 ? (
                        <div className="ii-vacio">
                            <Package size={56} strokeWidth={1.3} />
                            <h3>{busqueda ? 'Sin resultados' : 'Aún no tienes artículos'}</h3>
                            <p>{busqueda ? 'Prueba con otra búsqueda.' : 'Crea tu primer artículo para empezar tu control de inventario.'}</p>
                            {!busqueda && (
                                <button className="ii-btn-primario" onClick={() => setModalArticulo(true)}>
                                    <Plus size={18} /> Nuevo artículo
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="ii-tabla-contenedor">
                            <table className="ii-tabla">
                                <thead>
                                    <tr>
                                        <th>Artículo</th>
                                        <th className="ii-col-num">Físico</th>
                                        <th className="ii-col-num">Disponible</th>
                                        <th className="ii-col-num">Costo prom.</th>
                                        <th className="ii-col-num">Valor</th>
                                        <th className="ii-col-estado">Estado</th>
                                        <th className="ii-col-acciones">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {articulos.map((art) => {
                                        const estado = estadoStock(art);
                                        return (
                                            <tr key={art.idArticulo} className="ii-fila-clic" onClick={() => setDetalleId(art.idArticulo)}>
                                                <td>
                                                    <div className="ii-articulo">
                                                        <span className={`ii-semaforo ii-semaforo-${estado}`}></span>
                                                        <div>
                                                            <span className="ii-articulo-nombre">{art.nombre}</span>
                                                            <span className="ii-articulo-codigo">
                                                                {art.codigoInterno}
                                                                {art.categoria ? ` · ${art.categoria.nombre}` : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="ii-col-num">{formatoNumero(art.cantidadFisica)} <span className="ii-unidad">{art.unidadMedida}</span></td>
                                                <td className="ii-col-num ii-disponible">{formatoNumero(art.cantidadDisponible)}</td>
                                                <td className="ii-col-num">{formatoMoneda(art.costoPromedio)}</td>
                                                <td className="ii-col-num ii-valor">{formatoMoneda(art.valorTotal)}</td>
                                                <td className="ii-col-estado">
                                                    <span className={`ii-badge ii-badge-${estado}`}>
                                                        {estado === 'sano' ? 'Saludable' : estado === 'bajo' ? 'Stock bajo' : 'Agotado'}
                                                    </span>
                                                </td>
                                                <td className="ii-col-acciones">
                                                    <button className="ii-btn-mov" onClick={(e) => { e.stopPropagation(); setDetalleId(art.idArticulo); }}>
                                                        Ver detalle
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== PESTAÑA MOVIMIENTOS ===== */}
            {pestana === 'movimientos' && (
                <div className="ii-panel">
                    <div className="ii-construccion">
                        <ArrowDownUp size={48} strokeWidth={1.2} />
                        <p>Para registrar un movimiento o ver el historial, abre un artículo desde la pestaña Artículos.</p>
                        <p className="ii-construccion-sub">Cada artículo tiene su historial completo (kardex) en su detalle.</p>
                    </div>
                </div>
            )}

            {/* MODAL NUEVO ARTÍCULO */}
            {modalArticulo && (
                <ModalArticulo
                    onCerrar={() => setModalArticulo(false)}
                    onCreado={() => { setModalArticulo(false); refrescar(); toast.exito('Artículo creado correctamente.'); }}
                />
            )}
        </div>
    );
}

// ===== MODAL: NUEVO ARTÍCULO =====
function ModalArticulo({ onCerrar, onCreado }) {
    const toast = useToast();
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: '', unidadMedida: 'unidad', stockInicial: '', costoInicial: '',
        stockMinimo: '', codigoBarras: ''
    });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
        setGuardando(true);
        try {
            const datos = {
                nombre: form.nombre.trim(),
                unidadMedida: form.unidadMedida,
                stockInicial: form.stockInicial ? parseFloat(form.stockInicial) : 0,
                stockMinimo: form.stockMinimo ? parseFloat(form.stockMinimo) : 0
            };
            if (form.costoInicial) datos.costoInicial = parseFloat(form.costoInicial);
            if (form.codigoBarras.trim()) datos.codigoBarras = form.codigoBarras.trim();
            await invInternoService.crearArticulo(datos);
            onCreado();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo crear el artículo.');
        } finally {
            setGuardando(false);
        }
    };

    const UNIDADES = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena', 'saco', 'bulto'];

    return (
        <div className="ii-modal-fondo" onClick={onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>Nuevo artículo</h2>
                    <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <form onSubmit={guardar} className="ii-modal-form">
                    <div className="ii-campo">
                        <label>Nombre del artículo *</label>
                        <input type="text" placeholder="Ej: Cemento gris 50kg" value={form.nombre} onChange={(e) => setCampo('nombre', e.target.value)} autoFocus />
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Unidad de medida</label>
                            <select value={form.unidadMedida} onChange={(e) => setCampo('unidadMedida', e.target.value)}>
                                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="ii-campo">
                            <label>Stock inicial</label>
                            <input type="number" min="0" step="0.001" placeholder="0" value={form.stockInicial} onChange={(e) => setCampo('stockInicial', e.target.value)} />
                        </div>
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Stock mínimo (alerta)</label>
                            <input type="number" min="0" step="0.001" placeholder="0" value={form.stockMinimo} onChange={(e) => setCampo('stockMinimo', e.target.value)} />
                        </div>
                        <div className="ii-campo">
                            <label>Precio de compra <span className="ii-opcional">(opcional)</span></label>
                            <input type="number" min="0" step="0.01" placeholder="0" value={form.costoInicial} onChange={(e) => setCampo('costoInicial', e.target.value)} />
                        </div>
                    </div>
                    <div className="ii-campo">
                        <label>Código de barras <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Escanea o escribe el código" value={form.codigoBarras} onChange={(e) => setCampo('codigoBarras', e.target.value)} />
                    </div>
                    <div className="ii-modal-acciones">
                        <button type="button" className="ii-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ii-btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Crear artículo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InventarioInterno;