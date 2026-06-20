import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import engagementService from '../services/engagementService';
import productoService from '../services/productoService';
import Modal from '../components/Modal';
import {
    Sparkles, Star, Tag, Bell, Plus, Eye, EyeOff, Trash2,
    Percent, Calendar, Ticket, CheckCheck, MessageSquare, Gift, BellRing
} from 'lucide-react';
import './Engagement.css';

const TIPOS_PROMO = {
    porcentaje:    { etiqueta: 'Porcentaje', sufijo: '%' },
    monto_fijo:    { etiqueta: 'Monto fijo', sufijo: '$' },
    descuento:     { etiqueta: 'Descuento', sufijo: '%' }
};

const ICONOS_NOTIF = {
    pedido:     { color: '#3498db', icono: Ticket },
    pago:       { color: '#27AE60', icono: Gift },
    inventario: { color: '#f39c12', icono: Bell },
    mensaje:    { color: '#9b59b6', icono: MessageSquare },
    promocion:  { color: '#e91e63', icono: Tag },
    sistema:    { color: '#7f8c8d', icono: BellRing }
};

function Engagement() {
    const { usuario } = useAuth();
    const toast = useToast();
    const idEmpresa = usuario?.idEmpresa;

    const [pestana, setPestana] = useState('promociones');

    // Promociones
    const [promociones, setPromociones] = useState([]);
    const [cargandoPromos, setCargandoPromos] = useState(true);
    const [modalPromo, setModalPromo] = useState(false);
    const [promoForm, setPromoForm] = useState({ nombre: '', descripcion: '', tipo: 'porcentaje', valor: '', codigo: '', usoMaximo: '', fechaInicio: '', fechaFin: '' });
    const [guardandoPromo, setGuardandoPromo] = useState(false);

    // Reseñas
    const [productos, setProductos] = useState([]);
    const [productoSel, setProductoSel] = useState('');
    const [resenas, setResenas] = useState([]);
    const [cargandoResenas, setCargandoResenas] = useState(false);

    // Notificaciones
    const [notificaciones, setNotificaciones] = useState([]);
    const [cargandoNotis, setCargandoNotis] = useState(true);

    // ---- PROMOCIONES ----
    const cargarPromociones = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargandoPromos(true);
            const res = await engagementService.listarPromociones(idEmpresa);
            setPromociones(res.data.data?.promociones || res.data.data || []);
        } catch {
            toast.error('No se pudieron cargar las promociones.');
        } finally {
            setCargandoPromos(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    // ---- NOTIFICACIONES ----
    const cargarNotificaciones = useCallback(async () => {
        try {
            setCargandoNotis(true);
            const res = await engagementService.listarNotificaciones();
            setNotificaciones(res.data.data?.notificaciones || res.data.data || []);
        } catch {
            toast.error('No se pudieron cargar las notificaciones.');
        } finally {
            setCargandoNotis(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ---- PRODUCTOS (para reseñas) ----
    const cargarProductos = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            const res = await productoService.listar(idEmpresa, {});
            const lista = res.data.data?.productos || [];
            setProductos(lista);
            if (lista.length > 0 && !productoSel) setProductoSel(lista[0].idProducto);
        } catch { /* no bloqueante */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    const cargarResenas = useCallback(async (idProducto) => {
        if (!idProducto) return;
        try {
            setCargandoResenas(true);
            const res = await engagementService.listarResenasProducto(idProducto);
            setResenas(res.data.data?.resenas || res.data.data || []);
        } catch {
            setResenas([]);
        } finally {
            setCargandoResenas(false);
        }
    }, []);

    useEffect(() => {
        if (pestana === 'promociones') cargarPromociones();
        if (pestana === 'notificaciones') cargarNotificaciones();
        if (pestana === 'resenas') cargarProductos();
    }, [pestana, cargarPromociones, cargarNotificaciones, cargarProductos]);

    useEffect(() => {
        if (pestana === 'resenas' && productoSel) cargarResenas(productoSel);
    }, [productoSel, pestana, cargarResenas]);

    const crearPromocion = async (e) => {
        e.preventDefault();
        if (!promoForm.nombre || !promoForm.valor) {
            toast.error('El nombre y el valor son obligatorios.');
            return;
        }
        setGuardandoPromo(true);
        try {
            await engagementService.crearPromocion({
                idEmpresa,
                nombre: promoForm.nombre,
                descripcion: promoForm.descripcion || undefined,
                tipo: promoForm.tipo,
                valor: parseFloat(promoForm.valor),
                codigo: promoForm.codigo || undefined,
                usoMaximo: promoForm.usoMaximo ? parseInt(promoForm.usoMaximo, 10) : undefined,
                fechaInicio: promoForm.fechaInicio || undefined,
                fechaFin: promoForm.fechaFin || undefined
            });
            toast.exito('Promoción creada.');
            setModalPromo(false);
            setPromoForm({ nombre: '', descripcion: '', tipo: 'porcentaje', valor: '', codigo: '', usoMaximo: '', fechaInicio: '', fechaFin: '' });
            cargarPromociones();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo crear la promoción.');
        } finally {
            setGuardandoPromo(false);
        }
    };

    const desactivarPromocion = async (id) => {
        try {
            await engagementService.desactivarPromocion(id, idEmpresa);
            toast.exito('Promoción desactivada.');
            cargarPromociones();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo desactivar.');
        }
    };

    const moderarResena = async (resena) => {
        try {
            await engagementService.cambiarVisibilidadResena(resena.idResena, idEmpresa, !resena.visible);
            toast.exito(resena.visible ? 'Reseña oculta.' : 'Reseña visible.');
            cargarResenas(productoSel);
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo moderar.');
        }
    };

    const marcarLeida = async (id) => {
        try {
            await engagementService.marcarLeida(id);
            cargarNotificaciones();
        } catch { /* silencioso */ }
    };

    const marcarTodasLeidas = async () => {
        try {
            await engagementService.marcarTodasLeidas();
            toast.exito('Todas marcadas como leídas.');
            cargarNotificaciones();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo.');
        }
    };

    const formatoFecha = (f) => {
        if (!f) return '';
        return new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const formatoFechaHora = (f) => {
        if (!f) return '';
        return new Date(f).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    };

    const renderEstrellas = (calificacion) => {
        const c = Math.round(parseFloat(calificacion) || 0);
        return (
            <div className="eng-estrellas">
                {[1, 2, 3, 4, 5].map((n) => (
                    <Star key={n} size={16} className={n <= c ? 'eng-estrella-llena' : 'eng-estrella-vacia'} />
                ))}
            </div>
        );
    };

    return (
        <div className="engagement">
            <div className="eng-cabecera">
                <div>
                    <h1>Engagement</h1>
                    <p>Conecta con tus clientes: promociones, reseñas y avisos</p>
                </div>
                {pestana === 'promociones' && (
                    <button className="btn-primario" onClick={() => setModalPromo(true)}>
                        <Plus size={18} /> Nueva promoción
                    </button>
                )}
                {pestana === 'notificaciones' && notificaciones.length > 0 && (
                    <button className="btn-secundario" onClick={marcarTodasLeidas}>
                        <CheckCheck size={18} /> Marcar todas leídas
                    </button>
                )}
            </div>

            <div className="eng-pestanas">
                <button className={`eng-pestana ${pestana === 'promociones' ? 'eng-pestana-activa' : ''}`} onClick={() => setPestana('promociones')}>
                    <Tag size={18} /> Promociones
                </button>
                <button className={`eng-pestana ${pestana === 'resenas' ? 'eng-pestana-activa' : ''}`} onClick={() => setPestana('resenas')}>
                    <Star size={18} /> Reseñas
                </button>
                <button className={`eng-pestana ${pestana === 'notificaciones' ? 'eng-pestana-activa' : ''}`} onClick={() => setPestana('notificaciones')}>
                    <Bell size={18} /> Notificaciones
                </button>
            </div>

            {/* ===== PROMOCIONES ===== */}
            {pestana === 'promociones' && (
                cargandoPromos ? (
                    <div className="eng-cargando"><div className="eng-spinner"></div><p>Cargando...</p></div>
                ) : promociones.length === 0 ? (
                    <div className="eng-vacio">
                        <Gift size={56} strokeWidth={1.3} />
                        <h3>No hay promociones</h3>
                        <p>Crea ofertas y códigos de descuento para atraer clientes.</p>
                        <button className="btn-primario" onClick={() => setModalPromo(true)}><Plus size={18} /> Crear promoción</button>
                    </div>
                ) : (
                    <div className="eng-promos-grid">
                        {promociones.map((p) => {
                            const tipo = TIPOS_PROMO[p.tipo] || { sufijo: '' };
                            return (
                                <div className="eng-promo-tarjeta" key={p.idPromocion}>
                                    <div className="eng-promo-cinta">
                                        <Percent size={14} />
                                        {p.valor}{tipo.sufijo === '%' ? '%' : ''} OFF
                                    </div>
                                    <div className="eng-promo-cuerpo">
                                        <h3>{p.nombre}</h3>
                                        <p>{p.descripcion || 'Sin descripción'}</p>
                                        {p.codigo && (
                                            <div className="eng-promo-codigo">
                                                <Ticket size={14} /> {p.codigo}
                                            </div>
                                        )}
                                        <div className="eng-promo-vigencia">
                                            <Calendar size={13} />
                                            {p.fechaInicio ? formatoFecha(p.fechaInicio) : 'Sin inicio'} — {p.fechaFin ? formatoFecha(p.fechaFin) : 'Sin fin'}
                                        </div>
                                    </div>
                                    <button className="eng-promo-eliminar" onClick={() => desactivarPromocion(p.idPromocion)}>
                                        <Trash2 size={15} /> Desactivar
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* ===== RESEÑAS ===== */}
            {pestana === 'resenas' && (
                <div>
                    <div className="eng-resenas-selector">
                        <label>Ver reseñas de:</label>
                        <select value={productoSel} onChange={(e) => setProductoSel(e.target.value)}>
                            {productos.map((p) => (
                                <option key={p.idProducto} value={p.idProducto}>{p.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {cargandoResenas ? (
                        <div className="eng-cargando"><div className="eng-spinner"></div><p>Cargando reseñas...</p></div>
                    ) : resenas.length === 0 ? (
                        <div className="eng-vacio">
                            <Star size={56} strokeWidth={1.3} />
                            <h3>Sin reseñas</h3>
                            <p>Este producto aún no tiene reseñas de clientes.</p>
                        </div>
                    ) : (
                        <div className="eng-resenas-lista">
                            {resenas.map((r) => (
                                <div className={`eng-resena ${r.visible === false ? 'eng-resena-oculta' : ''}`} key={r.idResena}>
                                    <div className="eng-resena-cabecera">
                                        <div className="eng-resena-avatar">{(r.nombreCliente || 'C')[0].toUpperCase()}</div>
                                        <div className="eng-resena-info">
                                            <span className="eng-resena-nombre">{r.nombreCliente || 'Cliente'}</span>
                                            {renderEstrellas(r.calificacion)}
                                        </div>
                                        <button
                                            className="eng-resena-moderar"
                                            title={r.visible === false ? 'Mostrar' : 'Ocultar'}
                                            onClick={() => moderarResena(r)}
                                        >
                                            {r.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {r.titulo && <h4 className="eng-resena-titulo">{r.titulo}</h4>}
                                    <p className="eng-resena-comentario">{r.comentario || 'Sin comentario'}</p>
                                    <span className="eng-resena-fecha">{formatoFecha(r.fechaCreacion)}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* ===== NOTIFICACIONES ===== */}
            {pestana === 'notificaciones' && (
                cargandoNotis ? (
                    <div className="eng-cargando"><div className="eng-spinner"></div><p>Cargando...</p></div>
                ) : notificaciones.length === 0 ? (
                    <div className="eng-vacio">
                        <Bell size={56} strokeWidth={1.3} />
                        <h3>No hay notificaciones</h3>
                        <p>Aquí aparecerán los avisos de tu negocio.</p>
                    </div>
                ) : (
                    <div className="eng-notis-timeline">
                        {notificaciones.map((n) => {
                            const conf = ICONOS_NOTIF[n.tipo] || ICONOS_NOTIF.sistema;
                            const Icono = conf.icono;
                            return (
                                <div className={`eng-noti ${!n.leida ? 'eng-noti-nueva' : ''}`} key={n.idNotificacion} onClick={() => !n.leida && marcarLeida(n.idNotificacion)}>
                                    <div className="eng-noti-icono" style={{ background: `${conf.color}1a`, color: conf.color }}>
                                        <Icono size={18} />
                                    </div>
                                    <div className="eng-noti-cuerpo">
                                        <span className="eng-noti-titulo">{n.titulo}</span>
                                        <span className="eng-noti-mensaje">{n.mensaje}</span>
                                        <span className="eng-noti-fecha">{formatoFechaHora(n.fechaEnvio || n.fechaCreacion)}</span>
                                    </div>
                                    {!n.leida && <span className="eng-noti-punto"></span>}
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* Modal crear promoción */}
            <Modal abierto={modalPromo} onCerrar={() => setModalPromo(false)} titulo="Nueva promoción" ancho="520px">
                <form className="eng-form" onSubmit={crearPromocion}>
                    <div className="eng-campo">
                        <label>Nombre de la promoción *</label>
                        <input type="text" value={promoForm.nombre} onChange={(e) => setPromoForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Descuento de apertura" />
                    </div>
                    <div className="eng-campo">
                        <label>Descripción</label>
                        <input type="text" value={promoForm.descripcion} onChange={(e) => setPromoForm((p) => ({ ...p, descripcion: e.target.value }))} placeholder="Detalles de la oferta" />
                    </div>
                    <div className="eng-form-fila">
                        <div className="eng-campo">
                            <label>Tipo</label>
                            <select value={promoForm.tipo} onChange={(e) => setPromoForm((p) => ({ ...p, tipo: e.target.value }))}>
                                <option value="porcentaje">Porcentaje (%)</option>
                                <option value="monto_fijo">Monto fijo ($)</option>
                            </select>
                        </div>
                        <div className="eng-campo">
                            <label>Valor *</label>
                            <input type="number" value={promoForm.valor} onChange={(e) => setPromoForm((p) => ({ ...p, valor: e.target.value }))} placeholder="10" min="0" step="any" />
                        </div>
                    </div>
                    <div className="eng-form-fila">
                        <div className="eng-campo">
                            <label>Código (opcional)</label>
                            <input type="text" value={promoForm.codigo} onChange={(e) => setPromoForm((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))} placeholder="VERANO2026" />
                        </div>
                        <div className="eng-campo">
                            <label>Uso máximo</label>
                            <input type="number" value={promoForm.usoMaximo} onChange={(e) => setPromoForm((p) => ({ ...p, usoMaximo: e.target.value }))} placeholder="Ilimitado" min="1" />
                        </div>
                    </div>
                    <div className="eng-form-fila">
                        <div className="eng-campo">
                            <label>Fecha inicio</label>
                            <input type="date" value={promoForm.fechaInicio} onChange={(e) => setPromoForm((p) => ({ ...p, fechaInicio: e.target.value }))} />
                        </div>
                        <div className="eng-campo">
                            <label>Fecha fin</label>
                            <input type="date" value={promoForm.fechaFin} onChange={(e) => setPromoForm((p) => ({ ...p, fechaFin: e.target.value }))} />
                        </div>
                    </div>
                    <div className="eng-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalPromo(false)}>Cancelar</button>
                        <button type="submit" className="btn-primario" disabled={guardandoPromo}>
                            {guardandoPromo ? 'Creando...' : 'Crear promoción'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Engagement;