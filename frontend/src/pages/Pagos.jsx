import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import pagoService from '../services/pagoService';
import Modal from '../components/Modal';
import {
    CreditCard, CheckCircle, Clock, XCircle, RotateCcw,
    Eye, Banknote, Smartphone, Building2, DollarSign, AlertCircle
} from 'lucide-react';
import './Pagos.css';

const ESTADOS = {
    pendiente:  { etiqueta: 'Pendiente',  color: '#f39c12', icono: Clock },
    procesando: { etiqueta: 'Procesando', color: '#3498db', icono: Clock },
    completado: { etiqueta: 'Completado', color: '#27AE60', icono: CheckCircle },
    aprobado:   { etiqueta: 'Aprobado',   color: '#27AE60', icono: CheckCircle },
    fallido:    { etiqueta: 'Fallido',    color: '#e74c3c', icono: XCircle },
    rechazado:  { etiqueta: 'Rechazado',  color: '#e74c3c', icono: XCircle },
    reembolsado:{ etiqueta: 'Reembolsado',color: '#95a5a6', icono: RotateCcw },
    cancelado:  { etiqueta: 'Cancelado',  color: '#95a5a6', icono: XCircle }
};

const METODOS = {
    efectivo:          { etiqueta: 'Efectivo', icono: Banknote },
    contra_entrega:    { etiqueta: 'Contra entrega', icono: Banknote },
    tarjeta_credito:   { etiqueta: 'Tarjeta de crédito', icono: CreditCard },
    tarjeta_debito:    { etiqueta: 'Tarjeta débito', icono: CreditCard },
    pse:               { etiqueta: 'PSE', icono: Building2 },
    nequi:             { etiqueta: 'Nequi', icono: Smartphone },
    daviplata:         { etiqueta: 'Daviplata', icono: Smartphone },
    billetera_digital: { etiqueta: 'Billetera digital', icono: Smartphone },
    transferencia:     { etiqueta: 'Transferencia', icono: Building2 }
};

const FILTROS = ['todos', 'pendiente', 'completado', 'fallido', 'reembolsado'];

function Pagos() {
    const { usuario } = useAuth();
    const toast = useToast();
    const idEmpresa = usuario?.idEmpresa;

    const [pagos, setPagos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtro, setFiltro] = useState('todos');

    const [detalle, setDetalle] = useState(null);
    const [cargandoDetalle, setCargandoDetalle] = useState(false);
    const [reembolsando, setReembolsando] = useState(false);

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const params = filtro !== 'todos' ? { estado: filtro } : {};
            const res = await pagoService.listar(idEmpresa, params);
            setPagos(res.data.data?.pagos || []);
        } catch {
            toast.error('No se pudieron cargar los pagos.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa, filtro]);

    useEffect(() => { cargar(); }, [cargar]);

    const verDetalle = async (id) => {
        setDetalle({ cargando: true });
        setCargandoDetalle(true);
        try {
            const res = await pagoService.obtener(id, idEmpresa);
            setDetalle(res.data.data);
        } catch {
            toast.error('No se pudo cargar el pago.');
            setDetalle(null);
        } finally {
            setCargandoDetalle(false);
        }
    };

    const reembolsar = async (id) => {
        setReembolsando(true);
        try {
            await pagoService.reembolsar(id, idEmpresa, 'Reembolso desde el panel administrativo');
            toast.exito('Pago reembolsado.');
            setDetalle(null);
            cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo reembolsar.');
        } finally {
            setReembolsando(false);
        }
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const formatoFecha = (f) => {
        if (!f) return '—';
        return new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    const pag = detalle && !detalle.cargando ? (detalle.pago || detalle) : null;
    const transacciones = detalle?.transacciones || [];

    // Totales rápidos
    const totalCompletado = pagos
        .filter(p => ['completado', 'aprobado'].includes(p.estado))
        .reduce((sum, p) => sum + parseFloat(p.monto || 0), 0);

    return (
        <div className="pagos">
            <div className="pag-cabecera">
                <div>
                    <h1>Pagos</h1>
                    <p>Consulta y gestiona los pagos de tu negocio</p>
                </div>
            </div>

            {/* Resumen */}
            <div className="pag-resumen">
                <div className="pag-resumen-tarjeta">
                    <div className="pag-resumen-icono pag-icono-verde"><DollarSign size={20} /></div>
                    <div>
                        <span className="pag-resumen-valor">{formatoMoneda(totalCompletado)}</span>
                        <span className="pag-resumen-label">Total cobrado (visible)</span>
                    </div>
                </div>
                <div className="pag-resumen-tarjeta">
                    <div className="pag-resumen-icono pag-icono-azul"><CreditCard size={20} /></div>
                    <div>
                        <span className="pag-resumen-valor">{pagos.length}</span>
                        <span className="pag-resumen-label">Pagos {filtro !== 'todos' ? `(${filtro})` : 'totales'}</span>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="pag-filtros">
                {FILTROS.map((f) => (
                    <button key={f} className={`pag-filtro ${filtro === f ? 'pag-filtro-activo' : ''}`} onClick={() => setFiltro(f)}>
                        {f === 'todos' ? 'Todos' : ESTADOS[f]?.etiqueta || f}
                    </button>
                ))}
            </div>

            {cargando ? (
                <div className="pag-cargando"><div className="pag-spinner"></div><p>Cargando pagos...</p></div>
            ) : pagos.length === 0 ? (
                <div className="pag-vacio">
                    <CreditCard size={56} strokeWidth={1.3} />
                    <h3>No hay pagos</h3>
                    <p>{filtro !== 'todos' ? 'No hay pagos en este estado.' : 'Aún no se han registrado pagos.'}</p>
                </div>
            ) : (
                <div className="pag-tabla-contenedor">
                    <table className="pag-tabla">
                        <thead>
                            <tr>
                                <th>Pago</th>
                                <th>Método</th>
                                <th>Monto</th>
                                <th>Estado</th>
                                <th>Fecha</th>
                                <th className="pag-th-acciones">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {pagos.map((p) => {
                                const est = ESTADOS[p.estado] || {};
                                const met = METODOS[p.metodo] || {};
                                const MetIcono = met.icono || CreditCard;
                                return (
                                    <tr key={p.idPago}>
                                        <td>
                                            <span className="pag-codigo">{p.referencia || p.numeroPago || `#${p.idPago?.slice(0, 8)}`}</span>
                                        </td>
                                        <td>
                                            <div className="pag-metodo">
                                                <MetIcono size={16} />
                                                <span>{met.etiqueta || p.metodo || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="pag-monto">{formatoMoneda(p.monto)}</td>
                                        <td>
                                            <span className="pag-estado" style={{ background: `${est.color || '#999'}1a`, color: est.color || '#999' }}>
                                                {est.etiqueta || p.estado}
                                            </span>
                                        </td>
                                        <td className="pag-fecha">{formatoFecha(p.fechaCreacion)}</td>
                                        <td>
                                            <div className="pag-acciones">
                                                <button className="pag-accion" title="Ver detalle" onClick={() => verDetalle(p.idPago)}>
                                                    <Eye size={16} />
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

            {/* Modal detalle */}
            <Modal abierto={!!detalle} onCerrar={() => setDetalle(null)} titulo="Detalle del pago" ancho="600px">
                {cargandoDetalle || detalle?.cargando ? (
                    <div className="pag-detalle-cargando"><div className="pag-spinner"></div><p>Cargando...</p></div>
                ) : pag ? (
                    <div className="pag-detalle">
                        <div className="pag-detalle-cabecera">
                            <div>
                                <span className="pag-detalle-codigo">{pag.referencia || pag.numeroPago || 'Pago'}</span>
                                <span className="pag-detalle-fecha">{formatoFecha(pag.fechaCreacion)}</span>
                            </div>
                            <span className="pag-estado" style={{
                                background: `${ESTADOS[pag.estado]?.color || '#999'}1a`,
                                color: ESTADOS[pag.estado]?.color || '#999'
                            }}>
                                {ESTADOS[pag.estado]?.etiqueta || pag.estado}
                            </span>
                        </div>

                        <div className="pag-detalle-monto-grande">{formatoMoneda(pag.monto)}</div>

                        <div className="pag-detalle-datos">
                            <div className="pag-detalle-dato">
                                <span className="label">Método</span>
                                <span className="valor">{METODOS[pag.metodo]?.etiqueta || pag.metodo || '—'}</span>
                            </div>
                            <div className="pag-detalle-dato">
                                <span className="label">Tipo</span>
                                <span className="valor">{pag.tipoPago || '—'}</span>
                            </div>
                        </div>

                        {/* Transacciones */}
                        {transacciones.length > 0 && (
                            <div className="pag-transacciones">
                                <h3>Transacciones</h3>
                                {transacciones.map((t, i) => (
                                    <div className="pag-transaccion" key={i}>
                                        <AlertCircle size={14} />
                                        <span className="pag-trans-estado">{t.estado || t.tipo || 'Transacción'}</span>
                                        <span className="pag-trans-monto">{formatoMoneda(t.monto)}</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Acción reembolsar */}
                        {['completado', 'aprobado'].includes(pag.estado) && (
                            <div className="pag-detalle-acciones">
                                <button className="btn-peligro" onClick={() => reembolsar(pag.idPago)} disabled={reembolsando}>
                                    <RotateCcw size={16} /> {reembolsando ? 'Reembolsando...' : 'Reembolsar pago'}
                                </button>
                            </div>
                        )}
                    </div>
                ) : <p>No se pudo cargar el pago.</p>}
            </Modal>
        </div>
    );
}

export default Pagos;