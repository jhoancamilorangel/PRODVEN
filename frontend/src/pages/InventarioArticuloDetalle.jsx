import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import invInternoService from '../services/invInternoService';
import {
    X, Package, ArrowDownUp, ClipboardCheck, Download, Pencil,
    TrendingUp, TrendingDown, ArrowLeft, Calendar, Boxes
} from 'lucide-react';
import './InventarioArticuloDetalle.css';

const UNIDADES = ['unidad', 'kg', 'gramo', 'litro', 'ml', 'metro', 'cm', 'caja', 'paquete', 'docena', 'saco', 'bulto'];

function InventarioArticuloDetalle({ idArticulo, onVolver, onCambio }) {
    const toast = useToast();

    const [detalle, setDetalle] = useState(null);
    const [kardex, setKardex] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [modal, setModal] = useState(null); // 'movimiento' | 'ajuste' | 'editar'

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            const [resDetalle, resKardex] = await Promise.all([
                invInternoService.obtenerArticulo(idArticulo),
                invInternoService.obtenerKardex(idArticulo, { limit: 200 })
            ]);
            setDetalle(resDetalle.data.data || null);
            setKardex(resKardex.data.data?.movimientos || []);
        } catch {
            toast.error('No se pudo cargar el detalle del artículo.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idArticulo]);

    useEffect(() => { cargar(); }, [cargar]);

    const refrescar = () => { cargar(); if (onCambio) onCambio(); };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);
    const formatoNumero = (v) =>
        new Intl.NumberFormat('es-CO', { maximumFractionDigits: 3 }).format(v || 0);
    const formatoFecha = (f) => {
        if (!f) return 'Sin fecha';
        const d = new Date(f);
        if (isNaN(d.getTime())) return 'Sin fecha';
        return d.toLocaleString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    };

    const art = detalle?.articulo;
    const stocks = detalle?.stockPorBodega || [];
    const stockTotal = stocks.reduce((s, st) => s + parseFloat(st.cantidadFisica || 0), 0);
    const disponibleTotal = stocks.reduce((s, st) => s + parseFloat(st.cantidadDisponible || 0), 0);
    const valorTotal = stocks.reduce((s, st) => s + parseFloat(st.valorTotal || 0), 0);
    const costoProm = art ? parseFloat(art.costoPromedio || 0) : 0;
    const minimo = art ? parseFloat(art.stockMinimo || 0) : 0;
    const estado = stockTotal <= 0 ? 'agotado' : (minimo > 0 && stockTotal <= minimo ? 'bajo' : 'sano');

    const esEntrada = (tipo) => ['entrada', 'ajuste_positivo'].includes(tipo);
    const etiquetaTipo = (tipo) => ({
        entrada: 'Entrada', salida: 'Salida',
        ajuste_positivo: 'Ajuste +', ajuste_negativo: 'Ajuste −'
    }[tipo] || tipo);

    const totalEntradas = kardex.filter(m => esEntrada(m.tipo)).reduce((s, m) => s + parseFloat(m.cantidad || 0), 0);
    const totalSalidas = kardex.filter(m => !esEntrada(m.tipo)).reduce((s, m) => s + parseFloat(m.cantidad || 0), 0);

    const kardexFiltrado = kardex.filter(m => {
        if (filtroTipo === 'todos') return true;
        if (filtroTipo === 'entradas') return esEntrada(m.tipo);
        if (filtroTipo === 'salidas') return !esEntrada(m.tipo);
        return true;
    });

    const exportarCSV = () => {
        if (kardex.length === 0) { toast.info('No hay movimientos para exportar.'); return; }
        const cabecera = ['Fecha y hora', 'Tipo', 'Cantidad', 'Saldo resultante', 'Costo unitario', 'Motivo', 'Usuario'];
        const filas = kardex.map(m => [
            formatoFecha(m.fechaCreacion),
            etiquetaTipo(m.tipo),
            (esEntrada(m.tipo) ? '+' : '-') + m.cantidad,
            m.stockNuevo,
            m.costoUnitario || 0,
            (m.motivo || '').replace(/;/g, ','),
            (m.nombreUsuario || '').replace(/;/g, ',')
        ]);
        const contenido = [cabecera, ...filas].map(f => f.join(';')).join('\n');
        const blob = new Blob(['\uFEFF' + contenido], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `historial_${art?.nombre || 'articulo'}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        toast.exito('Historial exportado.');
    };

    if (cargando) {
        return (
            <div className="iad">
                <div className="iad-cargando"><div className="ii-spinner"></div><p>Cargando artículo...</p></div>
            </div>
        );
    }

    if (!art) {
        return (
            <div className="iad">
                <button className="iad-volver" onClick={onVolver}><ArrowLeft size={18} /> Volver</button>
                <div className="iad-cargando"><p>No se encontró el artículo.</p></div>
            </div>
        );
    }

    return (
        <div className="iad">
            {/* CABECERA */}
            <button className="iad-volver" onClick={onVolver}>
                <ArrowLeft size={18} /> Volver a artículos
            </button>

            <div className="iad-hero">
                <div className="iad-hero-fondo"></div>
                <div className="iad-hero-info">
                    <div className="iad-hero-icono"><Boxes size={28} /></div>
                    <div>
                        <div className="iad-hero-titulo">
                            <span className={`ii-semaforo ii-semaforo-${estado} iad-semaforo`}></span>
                            <h1>{art.nombre}</h1>
                        </div>
                        <p>{art.codigoInterno}{art.categoria ? ` · ${art.categoria.nombre}` : ''} · {art.unidadMedida}</p>
                    </div>
                </div>
                <span className={`iad-estado-badge ii-badge-${estado}`}>
                    {estado === 'sano' ? 'Saludable' : estado === 'bajo' ? 'Stock bajo' : 'Agotado'}
                </span>
            </div>

            {/* TARJETAS DE ESTADO */}
            <div className="iad-tarjetas">
                <div className="iad-tarjeta">
                    <span className="iad-tarjeta-label">Stock físico</span>
                    <span className="iad-tarjeta-num">{formatoNumero(stockTotal)} <small>{art.unidadMedida}</small></span>
                </div>
                <div className="iad-tarjeta">
                    <span className="iad-tarjeta-label">Disponible</span>
                    <span className="iad-tarjeta-num">{formatoNumero(disponibleTotal)}</span>
                </div>
                <div className="iad-tarjeta">
                    <span className="iad-tarjeta-label">Costo promedio</span>
                    <span className="iad-tarjeta-num iad-num-sm">{formatoMoneda(costoProm)}</span>
                </div>
                <div className="iad-tarjeta iad-tarjeta-valor">
                    <span className="iad-tarjeta-label">Valor total</span>
                    <span className="iad-tarjeta-num iad-num-sm">{formatoMoneda(valorTotal)}</span>
                </div>
                <div className={`iad-tarjeta ${estado === 'bajo' || estado === 'agotado' ? 'iad-tarjeta-alerta' : ''}`}>
                    <span className="iad-tarjeta-label">Stock mínimo</span>
                    <span className="iad-tarjeta-num">{formatoNumero(minimo)}</span>
                </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="iad-botones">
                <button className="iad-boton iad-boton-principal" onClick={() => setModal('movimiento')}>
                    <ArrowDownUp size={18} />
                    <span>Registrar movimiento</span>
                </button>
                <button className="iad-boton" onClick={() => setModal('ajuste')}>
                    <ClipboardCheck size={18} />
                    <span>Ajuste por conteo</span>
                </button>
                <button className="iad-boton" onClick={() => setModal('editar')}>
                    <Pencil size={18} />
                    <span>Editar artículo</span>
                </button>
                <button className="iad-boton" onClick={exportarCSV}>
                    <Download size={18} />
                    <span>Exportar historial</span>
                </button>
            </div>

            {/* HISTORIAL */}
            <div className="iad-historial">
                <div className="iad-historial-cab">
                    <div>
                        <h2>Historial de movimientos</h2>
                        <div className="iad-resumen">
                            <span className="iad-resumen-entrada"><TrendingUp size={15} /> Entradas: +{formatoNumero(totalEntradas)}</span>
                            <span className="iad-resumen-salida"><TrendingDown size={15} /> Salidas: −{formatoNumero(totalSalidas)}</span>
                            <span className="iad-resumen-total">{kardex.length} movimiento(s)</span>
                        </div>
                    </div>
                    <div className="iad-filtros">
                        {['todos', 'entradas', 'salidas'].map(f => (
                            <button
                                key={f}
                                className={`iad-filtro ${filtroTipo === f ? 'activo' : ''}`}
                                onClick={() => setFiltroTipo(f)}
                            >
                                {f === 'todos' ? 'Todos' : f === 'entradas' ? 'Entradas' : 'Salidas'}
                            </button>
                        ))}
                    </div>
                </div>

                {kardexFiltrado.length === 0 ? (
                    <div className="iad-hist-vacio">
                        <ArrowDownUp size={44} strokeWidth={1.2} />
                        <p>{kardex.length === 0 ? 'Aún no hay movimientos registrados.' : 'No hay movimientos de este tipo.'}</p>
                        {kardex.length === 0 && (
                            <button className="iad-boton iad-boton-principal" onClick={() => setModal('movimiento')}>
                                <ArrowDownUp size={18} /> <span>Registrar el primero</span>
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="iad-timeline">
                        {kardexFiltrado.map((m) => {
                            const entrada = esEntrada(m.tipo);
                            return (
                                <div className="iad-mov" key={m.idMovimiento}>
                                    <div className={`iad-mov-icono ${entrada ? 'entrada' : 'salida'}`}>
                                        {entrada ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                                    </div>
                                    <div className="iad-mov-cuerpo">
                                        <div className="iad-mov-l1">
                                            <span className="iad-mov-tipo">{etiquetaTipo(m.tipo)}</span>
                                            <span className={`iad-mov-cant ${entrada ? 'entrada' : 'salida'}`}>
                                                {entrada ? '+' : '−'}{formatoNumero(m.cantidad)} {art.unidadMedida}
                                            </span>
                                        </div>
                                        <div className="iad-mov-l2">
                                            <span className="iad-mov-motivo">{m.motivo || 'Sin motivo'}</span>
                                            <span className="iad-mov-saldo">Saldo: {formatoNumero(m.stockNuevo)} {art.unidadMedida}</span>
                                        </div>
                                        <div className="iad-mov-l3">
                                            <Calendar size={13} />
                                            <span>{formatoFecha(m.fechaCreacion)}</span>
                                            {m.nombreUsuario && <span className="iad-mov-usuario">· {m.nombreUsuario}</span>}
                                            {parseFloat(m.costoUnitario) > 0 && <span>· Costo: {formatoMoneda(m.costoUnitario)}</span>}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* MODALES */}
            {modal === 'movimiento' && (
                <ModalMovimientoDetalle
                    articulo={{ idArticulo: art.idArticulo, nombre: art.nombre, unidadMedida: art.unidadMedida, cantidadFisica: stockTotal }}
                    onCerrar={() => setModal(null)}
                    onRegistrado={() => { setModal(null); refrescar(); toast.exito('Movimiento registrado.'); }}
                />
            )}
            {modal === 'ajuste' && (
                <ModalAjuste
                    articulo={{ idArticulo: art.idArticulo, nombre: art.nombre, unidadMedida: art.unidadMedida, cantidadFisica: stockTotal }}
                    onCerrar={() => setModal(null)}
                    onAjustado={() => { setModal(null); refrescar(); toast.exito('Ajuste realizado.'); }}
                />
            )}
            {modal === 'editar' && (
                <ModalEditar
                    articulo={art}
                    onCerrar={() => setModal(null)}
                    onGuardado={() => { setModal(null); refrescar(); toast.exito('Artículo actualizado.'); }}
                />
            )}
        </div>
    );
}

// ===== MODAL: MOVIMIENTO =====
function ModalMovimientoDetalle({ articulo, onCerrar, onRegistrado }) {
    const toast = useToast();
    const [guardando, setGuardando] = useState(false);
    const [tipo, setTipo] = useState('entrada');
    const [form, setForm] = useState({ cantidad: '', costoUnitario: '', motivo: '' });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.cantidad || parseFloat(form.cantidad) <= 0) { toast.error('Ingresa una cantidad mayor a cero.'); return; }
        setGuardando(true);
        try {
            const datos = {
                idArticulo: articulo.idArticulo, tipo,
                cantidad: parseFloat(form.cantidad),
                motivo: form.motivo.trim() || (tipo === 'entrada' ? 'Entrada de mercancía' : 'Salida / consumo')
            };
            if (tipo === 'entrada' && form.costoUnitario) datos.costoUnitario = parseFloat(form.costoUnitario);
            await invInternoService.registrarMovimiento(datos);
            onRegistrado();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo registrar el movimiento.');
        } finally { setGuardando(false); }
    };

    return (
        <div className="ii-modal-fondo" onClick={onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>Registrar movimiento</h2>
                    <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <div className="ii-mov-articulo">
                    <Package size={18} />
                    <div>
                        <span className="ii-mov-nombre">{articulo.nombre}</span>
                        <span className="ii-mov-stock">Stock actual: {articulo.cantidadFisica} {articulo.unidadMedida}</span>
                    </div>
                </div>
                <form onSubmit={guardar} className="ii-modal-form">
                    <div className="ii-tipo-selector">
                        <button type="button" className={`ii-tipo-btn ii-tipo-entrada ${tipo === 'entrada' ? 'activo' : ''}`} onClick={() => setTipo('entrada')}>Entrada (llegó)</button>
                        <button type="button" className={`ii-tipo-btn ii-tipo-salida ${tipo === 'salida' ? 'activo' : ''}`} onClick={() => setTipo('salida')}>Salida (se gastó)</button>
                    </div>
                    <div className="ii-campo">
                        <label>Cantidad *</label>
                        <input type="number" min="0" step="0.001" placeholder="0" value={form.cantidad} onChange={(e) => setCampo('cantidad', e.target.value)} autoFocus />
                    </div>
                    {tipo === 'entrada' && (
                        <div className="ii-campo">
                            <label>Costo de compra unitario <span className="ii-opcional">(opcional)</span></label>
                            <input type="number" min="0" step="0.01" placeholder="0" value={form.costoUnitario} onChange={(e) => setCampo('costoUnitario', e.target.value)} />
                        </div>
                    )}
                    <div className="ii-campo">
                        <label>Motivo <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder={tipo === 'entrada' ? 'Ej: Compra a proveedor' : 'Ej: Consumo en obra'} value={form.motivo} onChange={(e) => setCampo('motivo', e.target.value)} />
                    </div>
                    <div className="ii-modal-acciones">
                        <button type="button" className="ii-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className={`ii-btn-primario ${tipo === 'salida' ? 'ii-btn-salida' : ''}`} disabled={guardando}>
                            {guardando ? 'Registrando...' : `Registrar ${tipo === 'entrada' ? 'entrada' : 'salida'}`}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===== MODAL: AJUSTE POR CONTEO =====
function ModalAjuste({ articulo, onCerrar, onAjustado }) {
    const toast = useToast();
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({ cantidadReal: '', motivo: '' });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));
    const diferencia = form.cantidadReal !== '' ? parseFloat(form.cantidadReal) - parseFloat(articulo.cantidadFisica) : null;

    const guardar = async (e) => {
        e.preventDefault();
        if (form.cantidadReal === '' || parseFloat(form.cantidadReal) < 0) { toast.error('Ingresa la cantidad real contada.'); return; }
        setGuardando(true);
        try {
            await invInternoService.ajustarPorConteo({
                idArticulo: articulo.idArticulo,
                cantidadReal: parseFloat(form.cantidadReal),
                motivo: form.motivo.trim() || 'Ajuste por conteo físico'
            });
            onAjustado();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo realizar el ajuste.');
        } finally { setGuardando(false); }
    };

    return (
        <div className="ii-modal-fondo" onClick={onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>Ajuste por conteo físico</h2>
                    <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <div className="ii-mov-articulo">
                    <ClipboardCheck size={18} />
                    <div>
                        <span className="ii-mov-nombre">{articulo.nombre}</span>
                        <span className="ii-mov-stock">Sistema dice: {articulo.cantidadFisica} {articulo.unidadMedida}</span>
                    </div>
                </div>
                <form onSubmit={guardar} className="ii-modal-form">
                    <div className="ii-campo">
                        <label>Cantidad real contada *</label>
                        <input type="number" min="0" step="0.001" placeholder="¿Cuánto hay en realidad?" value={form.cantidadReal} onChange={(e) => setCampo('cantidadReal', e.target.value)} autoFocus />
                    </div>
                    {diferencia !== null && diferencia !== 0 && (
                        <div className={`iad-diferencia ${diferencia > 0 ? 'positiva' : 'negativa'}`}>
                            {diferencia > 0 ? 'Sobran' : 'Faltan'} {Math.abs(diferencia)} {articulo.unidadMedida}
                            <span> · se registrará un ajuste {diferencia > 0 ? 'positivo' : 'negativo'}</span>
                        </div>
                    )}
                    <div className="ii-campo">
                        <label>Motivo <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" placeholder="Ej: Conteo físico mensual" value={form.motivo} onChange={(e) => setCampo('motivo', e.target.value)} />
                    </div>
                    <div className="ii-modal-acciones">
                        <button type="button" className="ii-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ii-btn-primario" disabled={guardando}>
                            {guardando ? 'Ajustando...' : 'Realizar ajuste'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===== MODAL: EDITAR ARTÍCULO =====
function ModalEditar({ articulo, onCerrar, onGuardado }) {
    const toast = useToast();
    const [guardando, setGuardando] = useState(false);
    const [form, setForm] = useState({
        nombre: articulo.nombre || '',
        unidadMedida: articulo.unidadMedida || 'unidad',
        stockMinimo: articulo.stockMinimo ?? '',
        codigoBarras: articulo.codigoBarras || ''
    });
    const setCampo = (c, v) => setForm((p) => ({ ...p, [c]: v }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre.trim()) { toast.error('El nombre es obligatorio.'); return; }
        setGuardando(true);
        try {
            await invInternoService.actualizarArticulo(articulo.idArticulo, {
                nombre: form.nombre.trim(),
                unidadMedida: form.unidadMedida,
                stockMinimo: form.stockMinimo === '' ? 0 : parseFloat(form.stockMinimo),
                codigoBarras: form.codigoBarras.trim() || null
            });
            onGuardado();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo actualizar.');
        } finally { setGuardando(false); }
    };

    return (
        <div className="ii-modal-fondo" onClick={onCerrar}>
            <div className="ii-modal" onClick={(e) => e.stopPropagation()}>
                <div className="ii-modal-cabecera">
                    <h2>Editar artículo</h2>
                    <button className="ii-modal-cerrar" onClick={onCerrar}><X size={20} /></button>
                </div>
                <form onSubmit={guardar} className="ii-modal-form">
                    <div className="ii-campo">
                        <label>Nombre del artículo *</label>
                        <input type="text" value={form.nombre} onChange={(e) => setCampo('nombre', e.target.value)} autoFocus />
                    </div>
                    <div className="ii-campo-fila">
                        <div className="ii-campo">
                            <label>Unidad de medida</label>
                            <select value={form.unidadMedida} onChange={(e) => setCampo('unidadMedida', e.target.value)}>
                                {UNIDADES.map((u) => <option key={u} value={u}>{u}</option>)}
                            </select>
                        </div>
                        <div className="ii-campo">
                            <label>Stock mínimo</label>
                            <input type="number" min="0" step="0.001" value={form.stockMinimo} onChange={(e) => setCampo('stockMinimo', e.target.value)} />
                        </div>
                    </div>
                    <div className="ii-campo">
                        <label>Código de barras <span className="ii-opcional">(opcional)</span></label>
                        <input type="text" value={form.codigoBarras} onChange={(e) => setCampo('codigoBarras', e.target.value)} />
                    </div>
                    <p className="iad-nota">El stock y el costo no se editan aquí; cambian mediante movimientos y ajustes, para mantener la trazabilidad.</p>
                    <div className="ii-modal-acciones">
                        <button type="button" className="ii-btn-cancelar" onClick={onCerrar}>Cancelar</button>
                        <button type="submit" className="ii-btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : 'Guardar cambios'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default InventarioArticuloDetalle;