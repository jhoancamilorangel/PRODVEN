import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import inventarioService from '../services/inventarioService';
import {
    Warehouse, Plus, Search, Package, AlertTriangle,
    LayoutDashboard, List, ArrowDownUp, FileSpreadsheet, X
} from 'lucide-react';
import './Inventario.css';

function Inventario() {
    const toast = useToast();

    const [pestana, setPestana] = useState('existencias');
    const [stock, setStock] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [modalArticulo, setModalArticulo] = useState(false);

    const cargarStock = useCallback(async (texto = '') => {
        try {
            setCargando(true);
            const params = texto ? { busqueda: texto } : {};
            const res = await inventarioService.listarStock(params);
            const datos = res.data.data?.stock || [];
            setStock(Array.isArray(datos) ? datos : []);
        } catch {
            setStock([]);
            toast.error('No se pudo cargar el inventario.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (pestana === 'existencias') cargarStock(busqueda);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pestana]);

    const buscar = (e) => {
        e.preventDefault();
        cargarStock(busqueda);
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const formatoNumero = (v) =>
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(v || 0);

    // Determina el estado de salud del stock de una fila
    const estadoStock = (item) => {
        const fisica = parseFloat(item.cantidadFisica ?? 0);
        const minimo = parseFloat(item.producto?.stockMinimo ?? 0);
        if (fisica <= 0) return 'agotado';
        if (minimo > 0 && fisica <= minimo) return 'bajo';
        return 'sano';
    };

    const PESTANAS = [
        { id: 'resumen', etiqueta: 'Resumen', icono: LayoutDashboard },
        { id: 'existencias', etiqueta: 'Existencias', icono: List },
        { id: 'stockBajo', etiqueta: 'Stock bajo', icono: AlertTriangle },
        { id: 'movimientos', etiqueta: 'Movimientos', icono: ArrowDownUp }
    ];

    return (
        <div className="inv">
            {/* Cabecera */}
            <div className="inv-cabecera">
                <div className="inv-cabecera-titulo">
                    <div className="inv-cabecera-icono"><Warehouse size={26} /></div>
                    <div>
                        <h1>Inventario</h1>
                        <p>Control de existencias de tu negocio</p>
                    </div>
                </div>
                <div className="inv-cabecera-acciones">
                    <button className="inv-btn-secundario" onClick={() => toast.info('La importación por Excel estará disponible pronto.')}>
                        <FileSpreadsheet size={18} /> Importar Excel
                    </button>
                    <button className="inv-btn-primario" onClick={() => setModalArticulo(true)}>
                        <Plus size={18} /> Nuevo artículo
                    </button>
                </div>
            </div>

            {/* Pestañas */}
            <div className="inv-pestanas">
                {PESTANAS.map((p) => {
                    const Icono = p.icono;
                    return (
                        <button
                            key={p.id}
                            className={`inv-pestana ${pestana === p.id ? 'inv-pestana-activa' : ''}`}
                            onClick={() => setPestana(p.id)}
                        >
                            <Icono size={18} /> {p.etiqueta}
                        </button>
                    );
                })}
            </div>

            {/* Contenido según pestaña */}
            <div className="inv-contenido">
                {pestana === 'existencias' && (
                    <>
                        <form className="inv-buscador" onSubmit={buscar}>
                            <Search size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por nombre o SKU..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                            <button type="submit">Buscar</button>
                        </form>

                        {cargando ? (
                            <div className="inv-cargando"><div className="inv-spinner"></div><p>Cargando inventario...</p></div>
                        ) : stock.length === 0 ? (
                            <div className="inv-vacio">
                                <Package size={56} strokeWidth={1.3} />
                                <h3>{busqueda ? 'Sin resultados' : 'Aún no tienes artículos'}</h3>
                                <p>{busqueda ? 'Prueba con otra búsqueda.' : 'Crea tu primer artículo para empezar a llevar el control.'}</p>
                                {!busqueda && (
                                    <button className="inv-btn-primario" onClick={() => setModalArticulo(true)}>
                                        <Plus size={18} /> Nuevo artículo
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="inv-tabla-contenedor">
                                <table className="inv-tabla">
                                    <thead>
                                        <tr>
                                            <th>Artículo</th>
                                            <th className="inv-col-num">Físico</th>
                                            <th className="inv-col-num">Reservado</th>
                                            <th className="inv-col-num">Disponible</th>
                                            <th className="inv-col-num">Costo prom.</th>
                                            <th className="inv-col-num">Valor</th>
                                            <th className="inv-col-estado">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stock.map((item, i) => {
                                            const estado = estadoStock(item);
                                            const disponible = parseFloat(item.cantidadFisica ?? 0) - parseFloat(item.cantidadReservada ?? 0);
                                            return (
                                                <tr key={item.idStockProducto || i}>
                                                    <td>
                                                        <div className="inv-articulo">
                                                            <span className={`inv-semaforo inv-semaforo-${estado}`}></span>
                                                            <div>
                                                                <span className="inv-articulo-nombre">{item.producto?.nombre || 'Artículo'}</span>
                                                                <span className="inv-articulo-sku">{item.producto?.codigoSku || ''}</span>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="inv-col-num">{formatoNumero(item.cantidadFisica)} <span className="inv-unidad">{item.producto?.unidadMedida || ''}</span></td>
                                                    <td className="inv-col-num inv-reservado">{formatoNumero(item.cantidadReservada)}</td>
                                                    <td className="inv-col-num inv-disponible">{formatoNumero(disponible)}</td>
                                                    <td className="inv-col-num">{formatoMoneda(item.costoPromedio)}</td>
                                                    <td className="inv-col-num inv-valor">{formatoMoneda(item.valorTotalInventario)}</td>
                                                    <td className="inv-col-estado">
                                                        <span className={`inv-badge inv-badge-${estado}`}>
                                                            {estado === 'sano' ? 'Saludable' : estado === 'bajo' ? 'Stock bajo' : 'Agotado'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </>
                )}

                {pestana === 'resumen' && (
                    <div className="inv-construccion"><LayoutDashboard size={48} strokeWidth={1.2} /><p>El resumen ejecutivo llegará en el siguiente paso.</p></div>
                )}
                {pestana === 'stockBajo' && (
                    <div className="inv-construccion"><AlertTriangle size={48} strokeWidth={1.2} /><p>Las alertas de stock bajo llegarán en el siguiente paso.</p></div>
                )}
                {pestana === 'movimientos' && (
                    <div className="inv-construccion"><ArrowDownUp size={48} strokeWidth={1.2} /><p>El registro de movimientos y el kardex llegarán en el siguiente paso.</p></div>
                )}
            </div>

            {/* Modal de nuevo artículo */}
            {modalArticulo && (
                <ModalArticulo
                    onCerrar={() => setModalArticulo(false)}
                    onCreado={() => { setModalArticulo(false); cargarStock(); toast.exito('Artículo creado correctamente.'); }}
                />
            )}
        </div>
    );
}

// ===== Modal para crear un artículo =====
function ModalArticulo({ onCerrar, onCreado }) {
    const toast = useToast();
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: '',
        unidadMedida: 'unidad',
        cantidadStock: '',
        stockMinimo: '',
        precioCosto: '',
        codigoBarras: ''
    });

    const setCampo = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) {
            toast.error('El nombre del artículo es obligatorio.');
            return;
        }
        setGuardando(true);
        try {
            const datos = {
                nombre: form.nombre.trim(),
                unidadMedida: form.unidadMedida,
                cantidadStock: form.cantidadStock ? parseInt(form.cantidadStock, 10) : 0,
                stockMinimo: form.stockMinimo ? parseInt(form.stockMinimo, 10) : 0
            };
            if (form.precioCosto) datos.precioCosto = parseFloat(form.precioCosto);
            if (form.codigoBarras.trim()) datos.codigoBarras = form.codigoBarras.trim();

            await inventarioService.crearArticulo(datos);
            onCreado();
        } catch (error) {
            const errores = error.response?.data?.errores;
            if (errores && errores.length > 0) toast.error(errores[0].mensaje);
            else toast.error(error.response?.data?.message || 'No se pudo crear el artículo.');
        } finally {
            setGuardando(false);
        }
    };

    const UNIDADES = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena'];

    return (
        <div className="inv-modal-fondo" onClick={onCerrar}>
            <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
                <div className="inv-modal-cabecera">
                    <h2>Nuevo artículo</h2>
                    <button className="inv-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <form onSubmit={guardar} className="inv-modal-form">
                    <div className="inv-campo">
                        <label>Nombre del artículo *</label>
                        <input type="text" placeholder="Ej: Cemento gris 50kg" value={form.nombre} onChange={(e) => setCampo('nombre', e.target.value)} autoFocus />
                    </div>
                    <div className="inv-campo-fila">
                        <div className="inv-campo">
                            <label>Unidad de medida</label>
                            <select value={form.unidadMedida} onChange={(e) => setCampo('unidadMedida', e.target.value)}>
                                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="inv-campo">
                            <label>Stock inicial</label>
                            <input type="number" min="0" placeholder="0" value={form.cantidadStock} onChange={(e) => setCampo('cantidadStock', e.target.value)} />
                        </div>
                    </div>
                    <div className="inv-campo-fila">
                        <div className="inv-campo">
                            <label>Stock mínimo (alerta)</label>
                            <input type="number" min="0" placeholder="0" value={form.stockMinimo} onChange={(e) => setCampo('stockMinimo', e.target.value)} />
                        </div>
                        <div className="inv-campo">
                            <label>Precio de compra <span className="inv-opcional">(opcional)</span></label>
                            <input type="number" min="0" step="0.01" placeholder="0" value={form.precioCosto} onChange={(e) => setCampo('precioCosto', e.target.value)} />
                        </div>
                    </div>
                    <div className="inv-campo">
                        <label>Código de barras <span className="inv-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Escanea o escribe el código" value={form.codigoBarras} onChange={(e) => setCampo('codigoBarras', e.target.value)} />
                    </div>
                    <div className="inv-modal-acciones">
                        <button type="button" className="inv-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="inv-btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Crear artículo'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default Inventario;