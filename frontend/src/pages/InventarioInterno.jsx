import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import invInternoService from '../services/invInternoService';
import InventarioArticuloDetalle from './InventarioArticuloDetalle';
import {
    Boxes, Plus, Search, Package, AlertTriangle, LayoutDashboard,
    List, ArrowDownUp, X, DollarSign, Layers, ArrowLeft,
    Tag, Truck, Pencil, Trash2, Phone, Mail, Warehouse, Upload, Download, Filter
} from 'lucide-react';
import './InventarioInterno.css';

const UNIDADES = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena', 'saco', 'bulto'];

function InventarioInterno() {
    const navigate = useNavigate();
    const toast = useToast();

    const [pestana, setPestana] = useState('resumen');
    const [resumen, setResumen] = useState(null);
    const [articulos, setArticulos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [proveedores, setProveedores] = useState([]);
    const [bodegas, setBodegas] = useState([]);
    const [stockBajo, setStockBajo] = useState([]);
    const [cargandoResumen, setCargandoResumen] = useState(true);
    const [cargandoArticulos, setCargandoArticulos] = useState(true);
    const [cargandoCategorias, setCargandoCategorias] = useState(false);
    const [cargandoProveedores, setCargandoProveedores] = useState(false);
    const [cargandoBodegas, setCargandoBodegas] = useState(false);
    const [cargandoStockBajo, setCargandoStockBajo] = useState(false);
    const [busqueda, setBusqueda] = useState('');
    const [filtroCategoria, setFiltroCategoria] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [modalArticulo, setModalArticulo] = useState(false);
    const [modalCategoria, setModalCategoria] = useState(null);
    const [modalProveedor, setModalProveedor] = useState(null);
    const [modalBodega, setModalBodega] = useState(null);
    const [modalCarga, setModalCarga] = useState(false);
    const [detalleId, setDetalleId] = useState(null);

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

    const cargarCategorias = useCallback(async () => {
        try {
            setCargandoCategorias(true);
            const res = await invInternoService.listarCategorias();
            const datos = res.data.data?.categorias || [];
            setCategorias(Array.isArray(datos) ? datos : []);
        } catch {
            setCategorias([]);
        } finally {
            setCargandoCategorias(false);
        }
    }, []);

    const cargarProveedores = useCallback(async () => {
        try {
            setCargandoProveedores(true);
            const res = await invInternoService.listarProveedores();
            const datos = res.data.data?.proveedores || [];
            setProveedores(Array.isArray(datos) ? datos : []);
        } catch {
            setProveedores([]);
        } finally {
            setCargandoProveedores(false);
        }
    }, []);

    const cargarBodegas = useCallback(async () => {
        try {
            setCargandoBodegas(true);
            const res = await invInternoService.listarBodegas();
            const datos = res.data.data?.bodegas || [];
            setBodegas(Array.isArray(datos) ? datos : []);
        } catch {
            setBodegas([]);
        } finally {
            setCargandoBodegas(false);
        }
    }, []);

    const cargarStockBajo = useCallback(async () => {
        try {
            setCargandoStockBajo(true);
            const res = await invInternoService.listarStockBajo();
            const datos = res.data.data?.articulos || [];
            setStockBajo(Array.isArray(datos) ? datos : []);
        } catch {
            setStockBajo([]);
        } finally {
            setCargandoStockBajo(false);
        }
    }, []);

    useEffect(() => {
        cargarResumen();
        cargarArticulos();
        cargarCategorias();
        cargarProveedores();
        cargarBodegas();
        cargarStockBajo();
    }, [cargarResumen, cargarArticulos, cargarCategorias, cargarProveedores, cargarBodegas, cargarStockBajo]);

    const buscar = (e) => {
        e.preventDefault();
        cargarArticulos(busqueda);
    };

    const refrescar = () => {
        cargarResumen();
        cargarArticulos(busqueda);
        cargarStockBajo();
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
    const formatoNumero = (v) =>
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(v || 0);

    const estadoStock = (art) => {
        const fisica = parseFloat(art.cantidadFisica ?? 0);
        const reorden = parseFloat(art.puntoReorden ?? 0);
        const minimo = parseFloat(art.stockMinimo ?? 0);
        const umbral = reorden > 0 ? reorden : minimo;
        if (fisica <= 0) return 'agotado';
        if (umbral > 0 && fisica <= umbral) return 'bajo';
        return 'sano';
    };

    const eliminarCategoria = async (cat) => {
        if (!window.confirm(`¿Eliminar la categoría "${cat.nombre}"? Los artículos no se borran, solo quedan sin categoría.`)) return;
        try {
            await invInternoService.eliminarCategoria(cat.idCategoria);
            toast.exito('Categoría eliminada.');
            cargarCategorias();
            cargarArticulos(busqueda);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar la categoría.');
        }
    };

    const eliminarProveedor = async (prov) => {
        if (!window.confirm(`¿Eliminar el proveedor "${prov.nombre}"? Los artículos no se borran, solo quedan sin proveedor.`)) return;
        try {
            await invInternoService.eliminarProveedor(prov.idProveedor);
            toast.exito('Proveedor eliminado.');
            cargarProveedores();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar el proveedor.');
        }
    };

    const eliminarBodega = async (bod) => {
        if (!window.confirm(`¿Eliminar la bodega "${bod.nombre}"?`)) return;
        try {
            await invInternoService.eliminarBodega(bod.idBodega);
            toast.exito('Bodega eliminada.');
            cargarBodegas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar la bodega.');
        }
    };

    const articulosFiltrados = articulos.filter((art) => {
        if (filtroCategoria && art.categoria?.idCategoria !== filtroCategoria) return false;
        if (filtroEstado && estadoStock(art) !== filtroEstado) return false;
        return true;
    });

    const PESTANAS = [
        { id: 'resumen', etiqueta: 'Resumen', icono: LayoutDashboard },
        { id: 'articulos', etiqueta: 'Artículos', icono: List },
        { id: 'stockBajo', etiqueta: 'Stock bajo', icono: AlertTriangle },
        { id: 'categorias', etiqueta: 'Categorías', icono: Tag },
        { id: 'proveedores', etiqueta: 'Proveedores', icono: Truck },
        { id: 'bodegas', etiqueta: 'Bodegas', icono: Warehouse },
        { id: 'movimientos', etiqueta: 'Movimientos', icono: ArrowDownUp }
    ];
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
                                <div
                                    className={`ii-tarjeta ${resumen?.articulosStockBajo > 0 ? 'ii-tarjeta-alerta' : ''} ii-fila-clic`}
                                    onClick={() => setPestana('stockBajo')}
                                >
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
                                <button className="ii-acceso" onClick={() => setModalCarga(true)}>
                                    <Upload size={20} /> <span>Carga masiva</span>
                                </button>
                                <button className="ii-acceso" onClick={() => setPestana('articulos')}>
                                    <List size={20} /> <span>Ver artículos</span>
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

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
                        <button className="ii-btn-secundario" onClick={() => setModalCarga(true)}>
                            <Upload size={18} /> Carga masiva
                        </button>
                        <button className="ii-btn-primario" onClick={() => setModalArticulo(true)}>
                            <Plus size={18} /> Nuevo artículo
                        </button>
                    </div>

                    <div className="ii-filtros-barra">
                        <div className="ii-filtro-grupo">
                            <Filter size={15} />
                            <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
                                <option value="">Todas las categorías</option>
                                {categorias.map((c) => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div className="ii-filtro-grupo">
                            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
                                <option value="">Todos los estados</option>
                                <option value="sano">Saludable</option>
                                <option value="bajo">Stock bajo</option>
                                <option value="agotado">Agotado</option>
                            </select>
                        </div>
                        {(filtroCategoria || filtroEstado) && (
                            <button className="ii-filtro-limpiar" onClick={() => { setFiltroCategoria(''); setFiltroEstado(''); }}>
                                Limpiar filtros
                            </button>
                        )}
                    </div>

                    {cargandoArticulos ? (
                        <div className="ii-cargando"><div className="ii-spinner"></div><p>Cargando artículos...</p></div>
                    ) : articulosFiltrados.length === 0 ? (
                        <div className="ii-vacio">
                            <Package size={56} strokeWidth={1.3} />
                            <h3>{busqueda || filtroCategoria || filtroEstado ? 'Sin resultados' : 'Aún no tienes artículos'}</h3>
                            <p>{busqueda || filtroCategoria || filtroEstado ? 'Prueba con otra búsqueda o filtro.' : 'Crea tu primer artículo para empezar tu control de inventario.'}</p>
                            {!busqueda && !filtroCategoria && !filtroEstado && (
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
                                    {articulosFiltrados.map((art) => {
                                        const estado = estadoStock(art);
                                        return (
                                            <tr key={art.idArticulo} className="ii-fila-clic" onClick={() => setDetalleId(art.idArticulo)}>
                                                <td>
                                                    <div className="ii-articulo">
                                                        <span className={`ii-semaforo ii-semaforo-${estado}`}></span>
                                                        <div>
                                                            <span className="ii-articulo-nombre">
                                                                {art.nombre}
                                                                {art.controlaLotes && <span className="ii-chip-lote">Lotes</span>}
                                                            </span>
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

            {pestana === 'stockBajo' && (
                <div className="ii-panel">
                    <div className="ii-panel-barra">
                        <div className="ii-panel-titulo">
                            <AlertTriangle size={20} /> <span>Artículos con stock bajo o agotado</span>
                        </div>
                        <button className="ii-btn-secundario" onClick={cargarStockBajo}>Actualizar</button>
                    </div>

                    {cargandoStockBajo ? (
                        <div className="ii-cargando"><div className="ii-spinner"></div><p>Cargando...</p></div>
                    ) : stockBajo.length === 0 ? (
                        <div className="ii-vacio">
                            <Package size={56} strokeWidth={1.3} />
                            <h3>¡Todo en orden!</h3>
                            <p>Ningún artículo está por debajo de su punto de reorden ni agotado.</p>
                        </div>
                    ) : (
                        <div className="ii-tabla-contenedor">
                            <table className="ii-tabla">
                                <thead>
                                    <tr>
                                        <th>Artículo</th>
                                        <th className="ii-col-num">Stock actual</th>
                                        <th className="ii-col-num">Mínimo</th>
                                        <th className="ii-col-num">Reorden</th>
                                        <th className="ii-col-estado">Estado</th>
                                        <th className="ii-col-acciones">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {stockBajo.map((art) => (
                                        <tr key={art.idArticulo} className="ii-fila-clic" onClick={() => setDetalleId(art.idArticulo)}>
                                            <td>
                                                <div className="ii-articulo">
                                                    <span className={`ii-semaforo ii-semaforo-${art.estado === 'agotado' ? 'agotado' : 'bajo'}`}></span>
                                                    <div>
                                                        <span className="ii-articulo-nombre">{art.nombre}</span>
                                                        <span className="ii-articulo-codigo">{art.codigoInterno}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="ii-col-num">{formatoNumero(art.cantidadFisica)} <span className="ii-unidad">{art.unidadMedida}</span></td>
                                            <td className="ii-col-num">{formatoNumero(art.stockMinimo)}</td>
                                            <td className="ii-col-num">{art.puntoReorden > 0 ? formatoNumero(art.puntoReorden) : '—'}</td>
                                            <td className="ii-col-estado">
                                                <span className={`ii-badge ii-badge-${art.estado === 'agotado' ? 'agotado' : 'bajo'}`}>
                                                    {art.estado === 'agotado' ? 'Agotado' : 'Stock bajo'}
                                                </span>
                                            </td>
                                            <td className="ii-col-acciones">
                                                <button className="ii-btn-mov" onClick={(e) => { e.stopPropagation(); setDetalleId(art.idArticulo); }}>
                                                    Ver detalle
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {pestana === 'categorias' && (
                <div className="ii-panel">
                    <div className="ii-panel-barra">
                        <div className="ii-panel-titulo">
                            <Tag size={20} /> <span>Categorías de artículos</span>
                        </div>
                        <button className="ii-btn-primario" onClick={() => setModalCategoria({})}>
                            <Plus size={18} /> Nueva categoría
                        </button>
                    </div>

                    {cargandoCategorias ? (
                        <div className="ii-cargando"><div className="ii-spinner"></div><p>Cargando categorías...</p></div>
                    ) : categorias.length === 0 ? (
                        <div className="ii-vacio">
                            <Tag size={56} strokeWidth={1.3} />
                            <h3>Aún no tienes categorías</h3>
                            <p>Organiza tus artículos creando categorías (ej: Materiales, Herramientas, Insumos).</p>
                            <button className="ii-btn-primario" onClick={() => setModalCategoria({})}>
                                <Plus size={18} /> Nueva categoría
                            </button>
                        </div>
                    ) : (
                        <div className="ii-tabla-contenedor">
                            <table className="ii-tabla">
                                <thead>
                                    <tr>
                                        <th>Categoría</th>
                                        <th>Descripción</th>
                                        <th className="ii-col-num">Artículos</th>
                                        <th className="ii-col-acciones">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {categorias.map((cat) => (
                                        <tr key={cat.idCategoria}>
                                            <td>
                                                <div className="ii-articulo">
                                                    <span className="ii-color-punto" style={{ background: cat.color || '#163b73' }}></span>
                                                    <span className="ii-articulo-nombre">{cat.nombre}</span>
                                                </div>
                                            </td>
                                            <td className="ii-celda-desc">{cat.descripcion || '—'}</td>
                                            <td className="ii-col-num">{cat.totalArticulos ?? 0}</td>
                                            <td className="ii-col-acciones">
                                                <div className="ii-acciones-fila">
                                                    <button className="ii-icono-btn" title="Editar" onClick={() => setModalCategoria(cat)}><Pencil size={16} /></button>
                                                    <button className="ii-icono-btn ii-icono-btn-peligro" title="Eliminar" onClick={() => eliminarCategoria(cat)}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {pestana === 'proveedores' && (
                <div className="ii-panel">
                    <div className="ii-panel-barra">
                        <div className="ii-panel-titulo">
                            <Truck size={20} /> <span>Proveedores</span>
                        </div>
                        <button className="ii-btn-primario" onClick={() => setModalProveedor({})}>
                            <Plus size={18} /> Nuevo proveedor
                        </button>
                    </div>

                    {cargandoProveedores ? (
                        <div className="ii-cargando"><div className="ii-spinner"></div><p>Cargando proveedores...</p></div>
                    ) : proveedores.length === 0 ? (
                        <div className="ii-vacio">
                            <Truck size={56} strokeWidth={1.3} />
                            <h3>Aún no tienes proveedores</h3>
                            <p>Registra a quienes te abastecen para llevar el control de tus compras.</p>
                            <button className="ii-btn-primario" onClick={() => setModalProveedor({})}>
                                <Plus size={18} /> Nuevo proveedor
                            </button>
                        </div>
                    ) : (
                        <div className="ii-tabla-contenedor">
                            <table className="ii-tabla">
                                <thead>
                                    <tr>
                                        <th>Proveedor</th>
                                        <th>Contacto</th>
                                        <th>NIT</th>
                                        <th className="ii-col-num">Artículos</th>
                                        <th className="ii-col-acciones">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {proveedores.map((prov) => (
                                        <tr key={prov.idProveedor}>
                                            <td>
                                                <div>
                                                    <span className="ii-articulo-nombre">{prov.nombre}</span>
                                                    {prov.contacto && <span className="ii-articulo-codigo">{prov.contacto}</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <div className="ii-contacto">
                                                    {prov.telefono && <span><Phone size={13} /> {prov.telefono}</span>}
                                                    {prov.correo && <span><Mail size={13} /> {prov.correo}</span>}
                                                    {!prov.telefono && !prov.correo && '—'}
                                                </div>
                                            </td>
                                            <td>{prov.nit || '—'}</td>
                                            <td className="ii-col-num">{prov.totalArticulos ?? 0}</td>
                                            <td className="ii-col-acciones">
                                                <div className="ii-acciones-fila">
                                                    <button className="ii-icono-btn" title="Editar" onClick={() => setModalProveedor(prov)}><Pencil size={16} /></button>
                                                    <button className="ii-icono-btn ii-icono-btn-peligro" title="Eliminar" onClick={() => eliminarProveedor(prov)}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {pestana === 'bodegas' && (
                <div className="ii-panel">
                    <div className="ii-panel-barra">
                        <div className="ii-panel-titulo">
                            <Warehouse size={20} /> <span>Bodegas</span>
                        </div>
                        <button className="ii-btn-primario" onClick={() => setModalBodega({})}>
                            <Plus size={18} /> Nueva bodega
                        </button>
                    </div>

                    {cargandoBodegas ? (
                        <div className="ii-cargando"><div className="ii-spinner"></div><p>Cargando bodegas...</p></div>
                    ) : bodegas.length === 0 ? (
                        <div className="ii-vacio">
                            <Warehouse size={56} strokeWidth={1.3} />
                            <h3>Aún no tienes bodegas</h3>
                            <p>Crea bodegas para organizar tu stock en distintas ubicaciones.</p>
                            <button className="ii-btn-primario" onClick={() => setModalBodega({})}>
                                <Plus size={18} /> Nueva bodega
                            </button>
                        </div>
                    ) : (
                        <div className="ii-tabla-contenedor">
                            <table className="ii-tabla">
                                <thead>
                                    <tr>
                                        <th>Bodega</th>
                                        <th>Ubicación</th>
                                        <th className="ii-col-num">Artículos con stock</th>
                                        <th className="ii-col-num">Valor</th>
                                        <th className="ii-col-acciones">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bodegas.map((bod) => (
                                        <tr key={bod.idBodega}>
                                            <td>
                                                <div className="ii-articulo">
                                                    <span className="ii-bodega-icono"><Warehouse size={16} /></span>
                                                    <div>
                                                        <span className="ii-articulo-nombre">
                                                            {bod.nombre}
                                                            {bod.esPrincipal && <span className="ii-badge-principal">Principal</span>}
                                                        </span>
                                                        {bod.codigo && <span className="ii-articulo-codigo">{bod.codigo}</span>}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="ii-celda-desc">{bod.direccion || bod.descripcion || '—'}</td>
                                            <td className="ii-col-num">{bod.articulosConStock ?? 0}</td>
                                            <td className="ii-col-num ii-valor">{formatoMoneda(bod.valorTotal)}</td>
                                            <td className="ii-col-acciones">
                                                <div className="ii-acciones-fila">
                                                    <button className="ii-icono-btn" title="Editar" onClick={() => setModalBodega(bod)}><Pencil size={16} /></button>
                                                    {!bod.esPrincipal && (
                                                        <button className="ii-icono-btn ii-icono-btn-peligro" title="Eliminar" onClick={() => eliminarBodega(bod)}><Trash2 size={16} /></button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {pestana === 'movimientos' && (
                <div className="ii-panel">
                    <div className="ii-construccion">
                        <ArrowDownUp size={48} strokeWidth={1.2} />
                        <p>Para registrar un movimiento o ver el historial, abre un artículo desde la pestaña Artículos.</p>
                        <p className="ii-construccion-sub">Cada artículo tiene su historial completo (kardex) en su detalle.</p>
                    </div>
                </div>
            )}

            {modalArticulo && (
                <ModalArticulo
                    categorias={categorias}
                    proveedores={proveedores}
                    bodegas={bodegas}
                    onCerrar={() => setModalArticulo(false)}
                    onCreado={() => { setModalArticulo(false); refrescar(); toast.exito('Artículo creado correctamente.'); }}
                />
            )}

            {modalCarga && (
                <ModalCargaMasiva
                    bodegas={bodegas}
                    onCerrar={() => setModalCarga(false)}
                    onTerminado={(n) => { setModalCarga(false); refrescar(); toast.exito(`${n} artículo(s) importado(s).`); }}
                />
            )}

            {modalCategoria !== null && (
                <ModalCategoria
                    categoria={modalCategoria}
                    onCerrar={() => setModalCategoria(null)}
                    onGuardado={() => { setModalCategoria(null); cargarCategorias(); }}
                />
            )}

            {modalProveedor !== null && (
                <ModalProveedor
                    proveedor={modalProveedor}
                    onCerrar={() => setModalProveedor(null)}
                    onGuardado={() => { setModalProveedor(null); cargarProveedores(); }}
                />
            )}

            {modalBodega !== null && (
                <ModalBodega
                    bodega={modalBodega}
                    onCerrar={() => setModalBodega(null)}
                    onGuardado={() => { setModalBodega(null); cargarBodegas(); }}
                />
            )}
        </div>
    );
}

// ===== MODAL: NUEVO ARTÍCULO =====
function ModalArticulo({ categorias, proveedores, bodegas, onCerrar, onCreado }) {
    const toast = useToast();
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: '', codigoInterno: '', descripcion: '', unidadMedida: 'unidad',
        stockInicial: '', costoInicial: '', stockMinimo: '', stockMaximo: '', puntoReorden: '',
        codigoBarras: '', idCategoria: '', idProveedor: '', idBodega: '', controlaLotes: false
    });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));

    useEffect(() => {
        if (bodegas.length > 0 && !form.idBodega) {
            const principal = bodegas.find(b => b.esPrincipal) || bodegas[0];
            setForm((p) => ({ ...p, idBodega: principal.idBodega }));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bodegas]);

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
        setGuardando(true);
        try {
            const datos = {
                nombre: form.nombre.trim(),
                unidadMedida: form.unidadMedida,
                stockInicial: form.stockInicial ? parseFloat(form.stockInicial) : 0,
                stockMinimo: form.stockMinimo ? parseFloat(form.stockMinimo) : 0,
                controlaLotes: form.controlaLotes
            };
            if (form.codigoInterno.trim()) datos.codigoInterno = form.codigoInterno.trim();
            if (form.descripcion.trim()) datos.descripcion = form.descripcion.trim();
            if (form.stockMaximo) datos.stockMaximo = parseFloat(form.stockMaximo);
            if (form.puntoReorden) datos.puntoReorden = parseFloat(form.puntoReorden);
            if (form.costoInicial) datos.costoInicial = parseFloat(form.costoInicial);
            if (form.codigoBarras.trim()) datos.codigoBarras = form.codigoBarras.trim();
            if (form.idCategoria) datos.idCategoria = form.idCategoria;
            if (form.idProveedor) datos.idProveedor = form.idProveedor;
            if (form.idBodega) datos.idBodega = form.idBodega;
            await invInternoService.crearArticulo(datos);
            onCreado();
        } catch (error) {
            const errores = error.response?.data?.data?.errores;
            toast.error(errores?.[0]?.mensaje || error.response?.data?.message || 'No se pudo crear el artículo.');
        } finally {
            setGuardando(false);
        }
    };

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
                            <label>Código interno <span className="ii-opcional">(se genera si lo dejas vacío)</span></label>
                            <input type="text" placeholder="Ej: ART-001" value={form.codigoInterno} onChange={(e) => setCampo('codigoInterno', e.target.value)} />
                        </div>
                        <div className="ii-campo">
                            <label>Unidad de medida</label>
                            <select value={form.unidadMedida} onChange={(e) => setCampo('unidadMedida', e.target.value)}>
                                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="ii-campo">
                        <label>Descripción <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Detalle del artículo" value={form.descripcion} onChange={(e) => setCampo('descripcion', e.target.value)} />
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Categoría <span className="ii-opcional">(opcional)</span></label>
                            <select value={form.idCategoria} onChange={(e) => setCampo('idCategoria', e.target.value)}>
                                <option value="">Sin categoría</option>
                                {categorias.map((c) => <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>)}
                            </select>
                        </div>
                        <div className="ii-campo">
                            <label>Proveedor <span className="ii-opcional">(opcional)</span></label>
                            <select value={form.idProveedor} onChange={(e) => setCampo('idProveedor', e.target.value)}>
                                <option value="">Sin proveedor</option>
                                {proveedores.map((p) => <option key={p.idProveedor} value={p.idProveedor}>{p.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Stock inicial</label>
                            <input type="number" min="0" step="0.001" placeholder="0" value={form.stockInicial} onChange={(e) => setCampo('stockInicial', e.target.value)} />
                        </div>
                        <div className="ii-campo">
                            <label>Bodega destino</label>
                            <select value={form.idBodega} onChange={(e) => setCampo('idBodega', e.target.value)}>
                                {bodegas.map((b) => (
                                    <option key={b.idBodega} value={b.idBodega}>
                                        {b.nombre}{b.esPrincipal ? ' (principal)' : ''}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Precio de compra <span className="ii-opcional">(opcional)</span></label>
                            <input type="number" min="0" step="0.01" placeholder="0" value={form.costoInicial} onChange={(e) => setCampo('costoInicial', e.target.value)} />
                        </div>
                        <div className="ii-campo">
                            <label>Stock mínimo (alerta)</label>
                            <input type="number" min="0" step="0.001" placeholder="0" value={form.stockMinimo} onChange={(e) => setCampo('stockMinimo', e.target.value)} />
                        </div>
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Punto de reorden <span className="ii-opcional">(opcional)</span></label>
                            <input type="number" min="0" step="0.001" placeholder="0" value={form.puntoReorden} onChange={(e) => setCampo('puntoReorden', e.target.value)} />
                        </div>
                        <div className="ii-campo">
                            <label>Stock máximo <span className="ii-opcional">(opcional)</span></label>
                            <input type="number" min="0" step="0.001" placeholder="0" value={form.stockMaximo} onChange={(e) => setCampo('stockMaximo', e.target.value)} />
                        </div>
                    </div>
                    <div className="ii-campo">
                        <label>Código de barras <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Escanea o escribe el código" value={form.codigoBarras} onChange={(e) => setCampo('codigoBarras', e.target.value)} />
                    </div>
                    <label className="ii-switch-campo">
                        <input type="checkbox" checked={form.controlaLotes} onChange={(e) => setCampo('controlaLotes', e.target.checked)} />
                        <span className="ii-switch-texto">
                            <strong>Este artículo maneja lotes y vencimientos</strong>
                            <small>Actívalo para alimentos, medicinas o productos perecederos</small>
                        </span>
                    </label>
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

// ===== MODAL: CARGA MASIVA CSV =====
function ModalCargaMasiva({ bodegas, onCerrar, onTerminado }) {
    const toast = useToast();
    const inputArchivo = useRef(null);
    const [procesando, setProcesando] = useState(false);
    const [progreso, setProgreso] = useState({ hechos: 0, total: 0 });
    const [idBodega, setIdBodega] = useState('');
    const [resultado, setResultado] = useState(null);

    useEffect(() => {
        if (bodegas.length > 0 && !idBodega) {
            const principal = bodegas.find(b => b.esPrincipal) || bodegas[0];
            setIdBodega(principal.idBodega);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [bodegas]);

    const descargarPlantilla = () => {
        const cabecera = ['nombre', 'unidadMedida', 'stockInicial', 'costoInicial', 'stockMinimo', 'codigoBarras'];
        const ejemplo = ['Cemento gris 50kg', 'saco', '100', '25000', '20', '7701234567890'];
        const contenido = [cabecera.join(','), ejemplo.join(',')].join('\n');
        const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'plantilla_articulos.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

    const parsearCSV = (texto) => {
        const lineas = texto.replace(/\r/g, '').split('\n').filter(l => l.trim().length > 0);
        if (lineas.length < 2) return [];
        const sep = lineas[0].includes(';') ? ';' : ',';
        const cabecera = lineas[0].split(sep).map(c => c.trim());
        const filas = [];
        for (let i = 1; i < lineas.length; i++) {
            const valores = lineas[i].split(sep);
            const obj = {};
            cabecera.forEach((col, idx) => { obj[col] = (valores[idx] || '').trim(); });
            filas.push(obj);
        }
        return filas;
    };

    const procesarArchivo = (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        const lector = new FileReader();
        lector.onload = async (ev) => {
            const filas = parsearCSV(ev.target.result);
            if (filas.length === 0) {
                toast.error('El archivo está vacío o no tiene el formato correcto.');
                return;
            }
            setProcesando(true);
            setProgreso({ hechos: 0, total: filas.length });
            let creados = 0;
            const errores = [];

            for (let i = 0; i < filas.length; i++) {
                const fila = filas[i];
                const nombre = (fila.nombre || '').trim();
                if (!nombre) {
                    errores.push(`Fila ${i + 2}: sin nombre, omitida.`);
                    setProgreso({ hechos: i + 1, total: filas.length });
                    continue;
                }
                try {
                    const datos = {
                        nombre,
                        unidadMedida: (fila.unidadMedida || 'unidad').trim() || 'unidad',
                        stockInicial: fila.stockInicial ? parseFloat(fila.stockInicial) : 0,
                        stockMinimo: fila.stockMinimo ? parseFloat(fila.stockMinimo) : 0
                    };
                    if (fila.costoInicial) datos.costoInicial = parseFloat(fila.costoInicial);
                    if (fila.codigoBarras) datos.codigoBarras = fila.codigoBarras.trim();
                    if (idBodega) datos.idBodega = idBodega;
                    await invInternoService.crearArticulo(datos);
                    creados++;
                } catch (err) {
                    errores.push(`Fila ${i + 2} (${nombre}): ${err.response?.data?.message || 'error al crear'}`);
                }
                setProgreso({ hechos: i + 1, total: filas.length });
            }

            setProcesando(false);
            setResultado({ creados, errores });
        };
        lector.onerror = () => { toast.error('No se pudo leer el archivo.'); };
        lector.readAsText(archivo, 'UTF-8');
    };

    return (
        <div className="ii-modal-fondo" onClick={procesando ? undefined : onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>Carga masiva de artículos</h2>
                    {!procesando && <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>}
                </div>
                <div className="ii-modal-form">
                    {resultado ? (
                        <div className="ii-carga-resultado">
                            <div className="ii-carga-ok">
                                <Package size={36} />
                                <h3>{resultado.creados} artículo(s) importado(s)</h3>
                            </div>
                            {resultado.errores.length > 0 && (
                                <div className="ii-carga-errores">
                                    <strong>{resultado.errores.length} con problemas:</strong>
                                    <ul>
                                        {resultado.errores.slice(0, 10).map((er, idx) => <li key={idx}>{er}</li>)}
                                    </ul>
                                    {resultado.errores.length > 10 && <p>...y {resultado.errores.length - 10} más.</p>}
                                </div>
                            )}
                            <div className="ii-modal-acciones">
                                <button type="button" className="ii-btn-primario" onClick={() => onTerminado(resultado.creados)}>
                                    Listo
                                </button>
                            </div>
                        </div>
                    ) : procesando ? (
                        <div className="ii-carga-progreso">
                            <div className="ii-spinner"></div>
                            <p>Importando {progreso.hechos} de {progreso.total}...</p>
                            <div className="ii-barra-progreso">
                                <div className="ii-barra-relleno" style={{ width: `${progreso.total ? (progreso.hechos / progreso.total) * 100 : 0}%` }}></div>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p className="ii-carga-info">
                                Sube un archivo CSV con tus artículos. Puedes exportarlo desde Excel
                                (Archivo → Guardar como → CSV). Descarga la plantilla para ver el formato.
                            </p>
                            <button type="button" className="ii-btn-plantilla" onClick={descargarPlantilla}>
                                <Download size={18} /> Descargar plantilla CSV
                            </button>

                            <div className="ii-campo">
                                <label>Bodega destino del stock</label>
                                <select value={idBodega} onChange={(e) => setIdBodega(e.target.value)}>
                                    {bodegas.map((b) => (
                                        <option key={b.idBodega} value={b.idBodega}>
                                            {b.nombre}{b.esPrincipal ? ' (principal)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <input
                                ref={inputArchivo}
                                type="file"
                                accept=".csv,text/csv"
                                style={{ display: 'none' }}
                                onChange={procesarArchivo}
                            />
                            <button type="button" className="ii-btn-subir" onClick={() => inputArchivo.current?.click()}>
                                <Upload size={20} /> Seleccionar archivo CSV
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

// ===== MODAL: CATEGORÍA (crear / editar) =====
function ModalCategoria({ categoria, onCerrar, onGuardado }) {
    const toast = useToast();
    const esEditar = !!categoria.idCategoria;
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: categoria.nombre || '',
        descripcion: categoria.descripcion || '',
        color: categoria.color || '#163b73'
    });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
        setGuardando(true);
        try {
            const datos = {
                nombre: form.nombre.trim(),
                descripcion: form.descripcion.trim() || null,
                color: form.color
            };
            if (esEditar) {
                await invInternoService.actualizarCategoria(categoria.idCategoria, datos);
                toast.exito('Categoría actualizada.');
            } else {
                await invInternoService.crearCategoria(datos);
                toast.exito('Categoría creada.');
            }
            onGuardado();
        } catch (error) {
            const errores = error.response?.data?.data?.errores;
            toast.error(errores?.[0]?.mensaje || error.response?.data?.message || 'No se pudo guardar la categoría.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="ii-modal-fondo" onClick={onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>{esEditar ? 'Editar categoría' : 'Nueva categoría'}</h2>
                    <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <form onSubmit={guardar} className="ii-modal-form">
                    <div className="ii-campo">
                        <label>Nombre *</label>
                        <input type="text" placeholder="Ej: Materiales de construcción" value={form.nombre} onChange={(e) => setCampo('nombre', e.target.value)} autoFocus />
                    </div>
                    <div className="ii-campo">
                        <label>Descripción <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Breve descripción" value={form.descripcion} onChange={(e) => setCampo('descripcion', e.target.value)} />
                    </div>
                    <div className="ii-campo">
                        <label>Color de identificación</label>
                        <div className="ii-color-selector">
                            <input type="color" value={form.color} onChange={(e) => setCampo('color', e.target.value)} />
                            <span>{form.color}</span>
                        </div>
                    </div>
                    <div className="ii-modal-acciones">
                        <button type="button" className="ii-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ii-btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : esEditar ? 'Guardar cambios' : 'Crear categoría'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===== MODAL: PROVEEDOR (crear / editar) =====
function ModalProveedor({ proveedor, onCerrar, onGuardado }) {
    const toast = useToast();
    const esEditar = !!proveedor.idProveedor;
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: proveedor.nombre || '',
        nit: proveedor.nit || '',
        telefono: proveedor.telefono || '',
        correo: proveedor.correo || '',
        direccion: proveedor.direccion || '',
        contacto: proveedor.contacto || '',
        notas: proveedor.notas || ''
    });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
        setGuardando(true);
        try {
            const datos = {
                nombre: form.nombre.trim(),
                nit: form.nit.trim() || null,
                telefono: form.telefono.trim() || null,
                correo: form.correo.trim() || null,
                direccion: form.direccion.trim() || null,
                contacto: form.contacto.trim() || null,
                notas: form.notas.trim() || null
            };
            if (esEditar) {
                await invInternoService.actualizarProveedor(proveedor.idProveedor, datos);
                toast.exito('Proveedor actualizado.');
            } else {
                await invInternoService.crearProveedor(datos);
                toast.exito('Proveedor creado.');
            }
            onGuardado();
        } catch (error) {
            const errores = error.response?.data?.data?.errores;
            toast.error(errores?.[0]?.mensaje || error.response?.data?.message || 'No se pudo guardar el proveedor.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="ii-modal-fondo" onClick={onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>{esEditar ? 'Editar proveedor' : 'Nuevo proveedor'}</h2>
                    <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <form onSubmit={guardar} className="ii-modal-form">
                    <div className="ii-campo">
                        <label>Nombre / Razón social *</label>
                        <input type="text" placeholder="Ej: Distribuidora El Constructor" value={form.nombre} onChange={(e) => setCampo('nombre', e.target.value)} autoFocus />
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>NIT <span className="ii-opcional">(opcional)</span></label>
                            <input type="text" placeholder="900.123.456-7" value={form.nit} onChange={(e) => setCampo('nit', e.target.value)} />
                        </div>
                        <div className="ii-campo">
                            <label>Persona de contacto <span className="ii-opcional">(opcional)</span></label>
                            <input type="text" placeholder="Nombre del contacto" value={form.contacto} onChange={(e) => setCampo('contacto', e.target.value)} />
                        </div>
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Teléfono <span className="ii-opcional">(opcional)</span></label>
                            <input type="tel" placeholder="300 000 0000" value={form.telefono} onChange={(e) => setCampo('telefono', e.target.value)} />
                        </div>
                        <div className="ii-campo">
                            <label>Correo <span className="ii-opcional">(opcional)</span></label>
                            <input type="email" placeholder="proveedor@correo.com" value={form.correo} onChange={(e) => setCampo('correo', e.target.value)} />
                        </div>
                    </div>
                    <div className="ii-campo">
                        <label>Dirección <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Dirección del proveedor" value={form.direccion} onChange={(e) => setCampo('direccion', e.target.value)} />
                    </div>
                    <div className="ii-campo">
                        <label>Notas <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Información adicional" value={form.notas} onChange={(e) => setCampo('notas', e.target.value)} />
                    </div>
                    <div className="ii-modal-acciones">
                        <button type="button" className="ii-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ii-btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : esEditar ? 'Guardar cambios' : 'Crear proveedor'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===== MODAL: BODEGA (crear / editar) =====
function ModalBodega({ bodega, onCerrar, onGuardado }) {
    const toast = useToast();
    const esEditar = !!bodega.idBodega;
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: bodega.nombre || '',
        codigo: bodega.codigo || '',
        descripcion: bodega.descripcion || '',
        direccion: bodega.direccion || ''
    });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
        setGuardando(true);
        try {
            const datos = {
                nombre: form.nombre.trim(),
                codigo: form.codigo.trim() || null,
                descripcion: form.descripcion.trim() || null,
                direccion: form.direccion.trim() || null
            };
            if (esEditar) {
                await invInternoService.actualizarBodega(bodega.idBodega, datos);
                toast.exito('Bodega actualizada.');
            } else {
                await invInternoService.crearBodega(datos);
                toast.exito('Bodega creada.');
            }
            onGuardado();
        } catch (error) {
            const errores = error.response?.data?.data?.errores;
            toast.error(errores?.[0]?.mensaje || error.response?.data?.message || 'No se pudo guardar la bodega.');
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="ii-modal-fondo" onClick={onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>{esEditar ? 'Editar bodega' : 'Nueva bodega'}</h2>
                    <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <form onSubmit={guardar} className="ii-modal-form">
                    <div className="ii-campo">
                        <label>Nombre de la bodega *</label>
                        <input type="text" placeholder="Ej: Bodega Norte" value={form.nombre} onChange={(e) => setCampo('nombre', e.target.value)} autoFocus />
                    </div>
                    <div className="ii-campo">
                        <label>Código <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Ej: BNOR" value={form.codigo} onChange={(e) => setCampo('codigo', e.target.value)} />
                    </div>
                    <div className="ii-campo">
                        <label>Dirección <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Ubicación de la bodega" value={form.direccion} onChange={(e) => setCampo('direccion', e.target.value)} />
                    </div>
                    <div className="ii-campo">
                        <label>Descripción <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Notas sobre la bodega" value={form.descripcion} onChange={(e) => setCampo('descripcion', e.target.value)} />
                    </div>
                    <div className="ii-modal-acciones">
                        <button type="button" className="ii-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ii-btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : esEditar ? 'Guardar cambios' : 'Crear bodega'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InventarioInterno;