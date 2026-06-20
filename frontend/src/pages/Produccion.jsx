import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import produccionService from '../services/produccionService';
import productoService from '../services/productoService';
import Modal from '../components/Modal';
import {
    Factory, ClipboardList, Play, CheckCircle, XCircle, Clock,
    Loader, Plus, FileText, Trash2, Power, Package
} from 'lucide-react';
import './Produccion.css';

const ESTADOS_ORDEN = {
    pendiente:   { etiqueta: 'Pendiente',   color: '#f39c12', icono: Clock },
    en_proceso:  { etiqueta: 'En proceso',  color: '#3498db', icono: Loader },
    completada:  { etiqueta: 'Completada',  color: '#27AE60', icono: CheckCircle },
    cancelada:   { etiqueta: 'Cancelada',   color: '#e74c3c', icono: XCircle }
};

const UNIDADES = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'];

function Produccion() {
    const { usuario } = useAuth();
    const toast = useToast();
    const idEmpresa = usuario?.idEmpresa;

    const [pestana, setPestana] = useState('ordenes');
    const [productos, setProductos] = useState([]);

    // Órdenes
    const [ordenes, setOrdenes] = useState([]);
    const [cargandoOrdenes, setCargandoOrdenes] = useState(true);
    const [detalleOrden, setDetalleOrden] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [procesando, setProcesando] = useState(false);
    const [modalCrearOrden, setModalCrearOrden] = useState(false);
    const [ordenForm, setOrdenForm] = useState({ idProducto: '', cantidadProducir: '', prioridad: 'normal' });
    const [guardandoOrden, setGuardandoOrden] = useState(false);

    // Recetas
    const [recetas, setRecetas] = useState([]);
    const [cargandoRecetas, setCargandoRecetas] = useState(true);
    const [modalCrearReceta, setModalCrearReceta] = useState(false);
    const [recetaForm, setRecetaForm] = useState({ idProducto: '', nombreVersion: '', cantidadProduce: '1', unidadProduccion: 'unidad', costoManoObraUnitario: '', costoIndirectoUnitario: '', descripcion: '' });
    const [guardandoReceta, setGuardandoReceta] = useState(false);

    // Detalle/componentes de receta
    const [detalleReceta, setDetalleReceta] = useState(null);
    const [cargandoDetReceta, setCargandoDetReceta] = useState(false);
    const [compForm, setCompForm] = useState({ idProductoComponente: '', cantidad: '', unidadMedida: 'unidad', porcentajeMerma: '' });
    const [guardandoComp, setGuardandoComp] = useState(false);

    const cargarProductos = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            const res = await productoService.listar(idEmpresa, {});
            setProductos(res.data.data?.productos || []);
        } catch {
            // no bloqueante
        }
    }, [idEmpresa]);

    const cargarOrdenes = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargandoOrdenes(true);
            const res = await produccionService.listarOrdenes(idEmpresa);
            setOrdenes(res.data.data?.ordenes || []);
        } catch {
            toast.error('No se pudieron cargar las órdenes.');
        } finally {
            setCargandoOrdenes(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    const cargarRecetas = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargandoRecetas(true);
            const res = await produccionService.listarRecetas(idEmpresa);
            setRecetas(res.data.data?.recetas || []);
        } catch {
            toast.error('No se pudieron cargar las recetas.');
        } finally {
            setCargandoRecetas(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    useEffect(() => { cargarProductos(); }, [cargarProductos]);

    useEffect(() => {
        if (pestana === 'ordenes') cargarOrdenes();
        if (pestana === 'recetas') cargarRecetas();
    }, [pestana, cargarOrdenes, cargarRecetas]);

    // ----- ÓRDENES -----
    const verDetalleOrden = async (id) => {
        setDetalleOrden({ cargando: true });
        setCargandoDetalle(true);
        try {
            const res = await produccionService.obtenerOrden(id, idEmpresa);
            setDetalleOrden(res.data.data);
        } catch {
            toast.error('No se pudo cargar la orden.');
            setDetalleOrden(null);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const crearOrden = async (e) => {
        e.preventDefault();
        if (!ordenForm.idProducto || !ordenForm.cantidadProducir) {
            toast.error('Selecciona el producto y la cantidad.');
            return;
        }
        setGuardandoOrden(true);
        try {
            await produccionService.crearOrden({
                idEmpresa,
                idProducto: ordenForm.idProducto,
                cantidadProducir: parseFloat(ordenForm.cantidadProducir),
                prioridad: ordenForm.prioridad
            });
            toast.exito('Orden de producción creada.');
            setModalCrearOrden(false);
            setOrdenForm({ idProducto: '', cantidadProducir: '', prioridad: 'normal' });
            cargarOrdenes();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo crear la orden.');
        } finally {
            setGuardandoOrden(false);
        }
    };

    const iniciarOrden = async (id) => {
        setProcesando(true);
        try {
            await produccionService.iniciarOrden(id, idEmpresa);
            toast.exito('Producción iniciada. Materiales consumidos.');
            await verDetalleOrden(id);
            cargarOrdenes();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo iniciar.');
        } finally {
            setProcesando(false);
        }
    };

    const completarOrden = async (id, cantidadProducida) => {
        setProcesando(true);
        try {
            await produccionService.completarOrden(id, { idEmpresa, cantidadProducida });
            toast.exito('Producción completada. Producto ingresado al inventario.');
            await verDetalleOrden(id);
            cargarOrdenes();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo completar.');
        } finally {
            setProcesando(false);
        }
    };

    const cancelarOrden = async (id) => {
        setProcesando(true);
        try {
            await produccionService.cancelarOrden(id, idEmpresa, 'Cancelada desde el panel administrativo');
            toast.exito('Orden cancelada.');
            await verDetalleOrden(id);
            cargarOrdenes();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cancelar.');
        } finally {
            setProcesando(false);
        }
    };

    // ----- RECETAS -----
    const crearReceta = async (e) => {
        e.preventDefault();
        if (!recetaForm.idProducto) {
            toast.error('Selecciona el producto a fabricar.');
            return;
        }
        setGuardandoReceta(true);
        try {
            const datos = {
                idEmpresa,
                idProducto: recetaForm.idProducto,
                nombreVersion: recetaForm.nombreVersion || undefined,
                cantidadProduce: parseFloat(recetaForm.cantidadProduce) || 1,
                unidadProduccion: recetaForm.unidadProduccion,
                costoManoObraUnitario: recetaForm.costoManoObraUnitario ? parseFloat(recetaForm.costoManoObraUnitario) : 0,
                costoIndirectoUnitario: recetaForm.costoIndirectoUnitario ? parseFloat(recetaForm.costoIndirectoUnitario) : 0,
                descripcion: recetaForm.descripcion || undefined
            };
            const res = await produccionService.crearReceta(datos);
            toast.exito('Receta creada. Ahora agrégale componentes.');
            setModalCrearReceta(false);
            setRecetaForm({ idProducto: '', nombreVersion: '', cantidadProduce: '1', unidadProduccion: 'unidad', costoManoObraUnitario: '', costoIndirectoUnitario: '', descripcion: '' });
            cargarRecetas();
            // Abrir directamente el detalle para agregar componentes
            const nuevaId = res.data.data?.idBom || res.data.data?.bom?.idBom;
            if (nuevaId) verDetalleReceta(nuevaId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo crear la receta.');
        } finally {
            setGuardandoReceta(false);
        }
    };

    const verDetalleReceta = async (id) => {
        setDetalleReceta({ cargando: true });
        setCargandoDetReceta(true);
        try {
            const res = await produccionService.obtenerReceta(id, idEmpresa);
            setDetalleReceta(res.data.data);
        } catch {
            toast.error('No se pudo cargar la receta.');
            setDetalleReceta(null);
        } finally {
            setCargandoDetReceta(false);
        }
    };

    const agregarComponente = async (e) => {
        e.preventDefault();
        const bomId = detalleReceta?.bom?.idBom || detalleReceta?.idBom;
        if (!compForm.idProductoComponente || !compForm.cantidad) {
            toast.error('Selecciona el material y la cantidad.');
            return;
        }
        setGuardandoComp(true);
        try {
            await produccionService.agregarComponente(bomId, {
                idEmpresa,
                idProductoComponente: compForm.idProductoComponente,
                cantidad: parseFloat(compForm.cantidad),
                unidadMedida: compForm.unidadMedida,
                porcentajeMerma: compForm.porcentajeMerma ? parseFloat(compForm.porcentajeMerma) : 0
            });
            toast.exito('Componente agregado.');
            setCompForm({ idProductoComponente: '', cantidad: '', unidadMedida: 'unidad', porcentajeMerma: '' });
            verDetalleReceta(bomId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo agregar el componente.');
        } finally {
            setGuardandoComp(false);
        }
    };

    const eliminarComponente = async (idComp) => {
        const bomId = detalleReceta?.bom?.idBom || detalleReceta?.idBom;
        try {
            await produccionService.eliminarComponente(bomId, idComp, idEmpresa);
            toast.exito('Componente eliminado.');
            verDetalleReceta(bomId);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar.');
        }
    };

    const activarReceta = async (id) => {
        try {
            await produccionService.activarReceta(id, idEmpresa);
            toast.exito('Receta activada. Ya puedes crear órdenes de este producto.');
            setDetalleReceta(null);
            cargarRecetas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo activar.');
        }
    };

    const eliminarReceta = async (id) => {
        try {
            await produccionService.eliminarReceta(id);
            toast.exito('Receta eliminada.');
            cargarRecetas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar.');
        }
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const ord = detalleOrden && !detalleOrden.cargando ? (detalleOrden.orden || detalleOrden) : null;
    const consumos = detalleOrden?.consumos || [];

    const rec = detalleReceta && !detalleReceta.cargando ? (detalleReceta.bom || detalleReceta) : null;
    const componentes = detalleReceta?.componentes || [];

    return (
        <div className="produccion">
            <div className="prod-cabecera">
                <div>
                    <h1>Producción</h1>
                    <p>Gestiona órdenes de producción y recetas</p>
                </div>
                {pestana === 'ordenes' ? (
                    <button className="btn-primario" onClick={() => setModalCrearOrden(true)}>
                        <Plus size={18} /> Nueva orden
                    </button>
                ) : (
                    <button className="btn-primario" onClick={() => setModalCrearReceta(true)}>
                        <Plus size={18} /> Nueva receta
                    </button>
                )}
            </div>

            <div className="prod-pestanas">
                <button className={`prod-pestana ${pestana === 'ordenes' ? 'prod-pestana-activa' : ''}`} onClick={() => setPestana('ordenes')}>
                    <ClipboardList size={18} /> Órdenes
                </button>
                <button className={`prod-pestana ${pestana === 'recetas' ? 'prod-pestana-activa' : ''}`} onClick={() => setPestana('recetas')}>
                    <FileText size={18} /> Recetas (BOM)
                </button>
            </div>

            {/* PESTAÑA ÓRDENES */}
            {pestana === 'ordenes' && (
                cargandoOrdenes ? (
                    <div className="prodm-cargando"><div className="prodm-spinner"></div><p>Cargando órdenes...</p></div>
                ) : ordenes.length === 0 ? (
                    <div className="prodm-vacio">
                        <Factory size={56} strokeWidth={1.3} />
                        <h3>No hay órdenes de producción</h3>
                        <p>Crea una receta activa primero, luego genera órdenes de producción.</p>
                    </div>
                ) : (
                    <div className="prod-lista">
                        {ordenes.map((o) => {
                            const est = ESTADOS_ORDEN[o.estado] || {};
                            const Icono = est.icono || Clock;
                            return (
                                <div className="prod-orden-tarjeta" key={o.idOrden} onClick={() => verDetalleOrden(o.idOrden)}>
                                    <div className="prod-orden-izq">
                                        <div className="prod-orden-icono" style={{ background: est.color }}>
                                            <Icono size={20} />
                                        </div>
                                        <div>
                                            <span className="prod-orden-numero">{o.numeroOrden || Orden}</span>
                                            <span className="prod-orden-producto">{o.nombreProducto || o.producto?.nombre || ''}</span>
                                        </div>
                                    </div>
                                    <div className="prod-orden-der">
                                        <div className="prod-orden-cantidad">
                                            <span className="prod-orden-cant-num">{o.cantidadProducir}</span>
                                            <span className="prod-orden-cant-label">a producir</span>
                                        </div>
                                         <span className="prod-estado-badge" style={{ background: `${est.color}1a`, color: est.color }}>
                                            {est.etiqueta || o.estado}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* PESTAÑA RECETAS */}
            {pestana === 'recetas' && (
                cargandoRecetas ? (
                    <div className="prodm-cargando"><div className="prodm-spinner"></div><p>Cargando recetas...</p></div>
                ) : recetas.length === 0 ? (
                    <div className="prodm-vacio">
                        <FileText size={56} strokeWidth={1.3} />
                        <h3>No hay recetas</h3>
                        <p>Las recetas (BOM) definen qué materiales lleva producir un producto.</p>
                    </div>
                ) : (
                    <div className="prod-recetas-grid">
                        {recetas.map((r) => (
                            <div className="prod-receta-tarjeta" key={r.idBom} onClick={() => verDetalleReceta(r.idBom)} style={{ cursor: 'pointer' }}>
                                <div className="prod-receta-cabecera">
                                    <div className="prod-receta-icono"><FileText size={20} /></div>
                                    {r.esActiva && <span className="prod-receta-activa">Activa</span>}
                                </div>
                                <h3 className="prod-receta-nombre">{r.nombreVersion || 'Receta'}</h3>
                                <p className="prod-receta-producto">{r.nombreProducto || r.producto?.nombre || ''}</p>
                                <div className="prod-receta-datos">
                                    <div className="prod-receta-dato">
                                        <span className="prod-receta-dato-label">Versión</span>
                                        <span className="prod-receta-dato-valor">v{r.numeroVersion || 1}</span>
                                    </div>
                                    <div className="prod-receta-dato">
                                        <span className="prod-receta-dato-label">Costo unitario</span>
                                        <span className="prod-receta-dato-valor">{formatoMoneda(r.costoTotalUnitario)}</span>
                                    </div>
                                </div>
                                <div className="prod-receta-acciones" onClick={(e) => e.stopPropagation()}>
                                    {!r.esActiva && (
                                        <button className="prod-receta-btn prod-btn-eliminar" onClick={() => eliminarReceta(r.idBom)}>
                                            <Trash2 size={15} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Modal crear orden */}
            <Modal abierto={modalCrearOrden} onCerrar={() => setModalCrearOrden(false)} titulo="Nueva orden de producción" ancho="480px">
                <form className="prod-form-modal" onSubmit={crearOrden}>
                    <div className="prod-campo">
                        <label>Producto a fabricar *</label>
                        <select value={ordenForm.idProducto} onChange={(e) => setOrdenForm((p) => ({ ...p, idProducto: e.target.value }))}>
                            <option value="">Selecciona un producto</option>
                            {productos.map((p) => (
                                <option key={p.idProducto} value={p.idProducto}>{p.nombre}</option>
                            ))}
                        </select>
                        <span className="prod-ayuda">El producto debe tener una receta activa.</span>
                    </div>
                    <div className="prod-campo">
                        <label>Cantidad a producir *</label>
                        <input type="number" value={ordenForm.cantidadProducir} onChange={(e) => setOrdenForm((p) => ({ ...p, cantidadProducir: e.target.value }))} placeholder="0" min="0" step="any" />
                    </div>
                    <div className="prod-campo">
                        <label>Prioridad</label>
                        <select value={ordenForm.prioridad} onChange={(e) => setOrdenForm((p) => ({ ...p, prioridad: e.target.value }))}>
                            <option value="baja">Baja</option>
                            <option value="normal">Normal</option>
                            <option value="alta">Alta</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    <div className="prod-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalCrearOrden(false)}>Cancelar</button>
                        <button type="submit" className="btn-primario" disabled={guardandoOrden}>
                            {guardandoOrden ? 'Creando...' : 'Crear orden'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal crear receta */}
            <Modal abierto={modalCrearReceta} onCerrar={() => setModalCrearReceta(false)} titulo="Nueva receta (BOM)" ancho="520px">
                <form className="prod-form-modal" onSubmit={crearReceta}>
                    <div className="prod-campo">
                        <label>Producto a fabricar *</label>
                        <select value={recetaForm.idProducto} onChange={(e) => setRecetaForm((p) => ({ ...p, idProducto: e.target.value }))}>
                            <option value="">Selecciona un producto</option>
                            {productos.map((p) => (
                                <option key={p.idProducto} value={p.idProducto}>{p.nombre}</option>
                            ))}
                        </select>
                        <span className="prod-ayuda">Debe estar marcado como fabricado en el catálogo.</span>
                    </div>
                    <div className="prod-campo">
                        <label>Nombre de la versión</label>
                        <input type="text" value={recetaForm.nombreVersion} onChange={(e) => setRecetaForm((p) => ({ ...p, nombreVersion: e.target.value }))} placeholder="Ej: Receta estándar" />
                    </div>
                    <div className="prod-form-fila">
                        <div className="prod-campo">
                            <label>Cantidad que produce</label>
                            <input type="number" value={recetaForm.cantidadProduce} onChange={(e) => setRecetaForm((p) => ({ ...p, cantidadProduce: e.target.value }))} min="0" step="any" />
                        </div>
                        <div className="prod-campo">
                            <label>Unidad</label>
                            <select value={recetaForm.unidadProduccion} onChange={(e) => setRecetaForm((p) => ({ ...p, unidadProduccion: e.target.value }))}>
                                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="prod-form-fila">
                        <div className="prod-campo">
                            <label>Costo mano de obra</label>
                            <input type="number" value={recetaForm.costoManoObraUnitario} onChange={(e) => setRecetaForm((p) => ({ ...p, costoManoObraUnitario: e.target.value }))} placeholder="0" min="0" step="any" />
                        </div>
                        <div className="prod-campo">
                            <label>Costo indirecto</label>
                            <input type="number" value={recetaForm.costoIndirectoUnitario} onChange={(e) => setRecetaForm((p) => ({ ...p, costoIndirectoUnitario: e.target.value }))} placeholder="0" min="0" step="any" />
                        </div>
                    </div>
                    <div className="prod-campo">
                        <label>Descripción</label>
                        <textarea rows={2} value={recetaForm.descripcion} onChange={(e) => setRecetaForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Notas de la receta..." />
                    </div>
                    <div className="prod-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalCrearReceta(false)}>Cancelar</button>
                        <button type="submit" className="btn-primario" disabled={guardandoReceta}>
                            {guardandoReceta ? 'Creando...' : 'Crear receta'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal detalle de orden */}
            <Modal abierto={!!detalleOrden} onCerrar={() => setDetalleOrden(null)} titulo="Detalle de la orden" ancho="600px">
                {cargandoDetalle || detalleOrden?.cargando ? (
                    <div className="prodm-detalle-cargando"><div className="prodm-spinner"></div><p>Cargando...</p></div>
                ) : ord ? (
                    <div className="prod-detalle">
                        <div className="prod-detalle-cabecera">
                            <div>
                                <span className="prod-detalle-numero">{ord.numeroOrden || 'Orden'}</span>
                                <span className="prod-detalle-producto">{ord.nombreProducto || ord.producto?.nombre || ''}</span>
                            </div>
                            <span className="prod-estado-badge" style={{
                                background: `${ESTADOS_ORDEN[ord.estado]?.color || '#999'}1a`,
                                color: ESTADOS_ORDEN[ord.estado]?.color || '#999'
                            }}>
                                {ESTADOS_ORDEN[ord.estado]?.etiqueta || ord.estado}
                            </span>
                        </div>
                        <div className="prod-detalle-datos">
                            <div className="prod-detalle-dato">
                                <span className="label">Cantidad a producir</span>
                                <span className="valor">{ord.cantidadProducir}</span>
                            </div>
                            {ord.cantidadProducida != null && (
                                <div className="prod-detalle-dato">
                                    <span className="label">Cantidad producida</span>
                                    <span className="valor">{ord.cantidadProducida}</span>
                                </div>
                            )}
                        </div>
                        <div className="prod-detalle-consumos">
                            <h3>Materiales</h3>
                            {consumos.length === 0 ? (
                                <p className="prod-sin-consumos">Los materiales se consumen al iniciar la producción.</p>
                            ) : (
                                consumos.map((c, i) => (
                                    <div className="prod-consumo-item" key={i}>
                                        <Package size={15} />
                                        <span className="prod-consumo-nombre">{c.nombreProducto || c.nombre || `Material ${i + 1}`}</span>
                                        <span className="prod-consumo-cant">{c.cantidadConsumida || c.cantidad} {c.unidadMedida || ''}</span>
                                    </div>
                                ))
                            )}
                        </div>
                        <div className="prod-detalle-acciones">
                            {ord.estado === 'pendiente' && (
                                <>
                                    <button className="btn-primario" onClick={() => iniciarOrden(ord.idOrden)} disabled={procesando}>
                                        <Play size={16} /> Iniciar producción
                                    </button>
                                    <button className="btn-secundario" onClick={() => cancelarOrden(ord.idOrden)} disabled={procesando}>
                                        Cancelar orden
                                    </button>
                                </>
                            )}
                            {ord.estado === 'en_proceso' && (
                                <>
                                    <button className="btn-primario" onClick={() => completarOrden(ord.idOrden, ord.cantidadProducir)} disabled={procesando}>
                                        <CheckCircle size={16} /> Completar (producir {ord.cantidadProducir})
                                    </button>
                                    <button className="btn-secundario" onClick={() => cancelarOrden(ord.idOrden)} disabled={procesando}>
                                        Cancelar orden
                                    </button>
                                </>
                            )}
                            {(ord.estado === 'completada' || ord.estado === 'cancelada') && (
                                <p className="prod-orden-final">Esta orden está {ESTADOS_ORDEN[ord.estado]?.etiqueta.toLowerCase()}.</p>
                            )}
                        </div>
                    </div>
                ) : <p>No se pudo cargar la orden.</p>}
            </Modal>

            {/* Modal detalle de receta + componentes */}
            <Modal abierto={!!detalleReceta} onCerrar={() => setDetalleReceta(null)} titulo="Receta y componentes" ancho="640px">
                {cargandoDetReceta || detalleReceta?.cargando ? (
                    <div className="prodm-detalle-cargando"><div className="prodm-spinner"></div><p>Cargando...</p></div>
                ) : rec ? (
                    <div className="prod-detalle">
                        <div className="prod-detalle-cabecera">
                            <div>
                                <span className="prod-detalle-numero">{rec.nombreVersion || 'Receta'}</span>
                                <span className="prod-detalle-producto">{rec.nombreProducto || ''} · v{rec.numeroVersion || 1}</span>
                            </div>
                            {rec.esActiva
                                ? <span className="prod-receta-activa">Activa</span>
                                : <span className="prod-estado-badge" style={{ background: '#95a5a61a', color: '#7f8c8d' }}>Borrador</span>}
                        </div>

                        {/* Lista de componentes */}
                        <div className="prod-detalle-consumos">
                            <h3>Componentes / Materiales</h3>
                            {componentes.length === 0 ? (
                                <p className="prod-sin-consumos">Esta receta aún no tiene componentes. Agrégalos abajo.</p>
                            ) : (
                                componentes.map((c) => (
                                    <div className="prod-consumo-item" key={c.idComponente}>
                                        <Package size={15} />
                                        <span className="prod-consumo-nombre">{c.nombreProducto || c.nombreComponente || 'Material'}</span>
                                        <span className="prod-consumo-cant">{c.cantidad} {c.unidadMedida}</span>
                                        {!rec.esActiva && (
                                            <button className="prod-comp-eliminar" onClick={() => eliminarComponente(c.idComponente)}>
                                                <Trash2 size={14} />
                                            </button>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Form agregar componente (solo si borrador) */}
                        {!rec.esActiva && (
                            <form className="prod-comp-form" onSubmit={agregarComponente}>
                                <h3>Agregar material</h3>
                                <div className="prod-form-fila">
                                    <div className="prod-campo prod-campo-ancho">
                                        <label>Material</label>
                                        <select value={compForm.idProductoComponente} onChange={(e) => setCompForm((p) => ({ ...p, idProductoComponente: e.target.value }))}>
                                            <option value="">Selecciona</option>
                                            {productos.map((p) => (
                                                <option key={p.idProducto} value={p.idProducto}>{p.nombre}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="prod-campo">
                                        <label>Cantidad</label>
                                        <input type="number" value={compForm.cantidad} onChange={(e) => setCompForm((p) => ({ ...p, cantidad: e.target.value }))} placeholder="0" min="0" step="any" />
                                    </div>
                                    <div className="prod-campo">
                                        <label>Unidad</label>
                                        <select value={compForm.unidadMedida} onChange={(e) => setCompForm((p) => ({ ...p, unidadMedida: e.target.value }))}>
                                            {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <button type="submit" className="btn-secundario" disabled={guardandoComp}>
                                    <Plus size={15} /> {guardandoComp ? 'Agregando...' : 'Agregar material'}
                                </button>
                            </form>
                        )}

                        {/* Activar receta */}
                        {!rec.esActiva && componentes.length > 0 && (
                            <div className="prod-detalle-acciones">
                                <button className="btn-primario" onClick={() => activarReceta(rec.idBom)}>
                                    <Power size={16} /> Activar receta
                                </button>
                            </div>
                        )}
                    </div>
                ) : <p>No se pudo cargar la receta.</p>}
            </Modal>
        </div>
    );
}

export default Produccion;