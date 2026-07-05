import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import solicitudNegocioService from '../services/solicitudNegocioService';
import {
    Store, Check, X, Clock, Mail, Phone, MapPin, Tag,
    Building2, Loader2, Inbox, ShieldCheck, AlertTriangle, User
} from 'lucide-react';
import './SolicitudesNegocio.css';

const FILTROS = [
    { valor: 'pendiente', etiqueta: 'Pendientes' },
    { valor: 'aprobada', etiqueta: 'Aprobadas' },
    { valor: 'rechazada', etiqueta: 'Rechazadas' }
];

function SolicitudesNegocio() {
    const toast = useToast();

    const [filtro, setFiltro] = useState('pendiente');
    const [solicitudes, setSolicitudes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(null); // idSolicitud en proceso

    // Modales
    const [modalAprobar, setModalAprobar] = useState(null); // solicitud a aprobar
    const [modalRechazar, setModalRechazar] = useState(null); // solicitud a rechazar
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const res = await solicitudNegocioService.listar({ estado: filtro, limit: 50 });
            setSolicitudes(res.data?.data?.solicitudes || []);
        } catch {
            setSolicitudes([]);
            toast.error('No se pudieron cargar las solicitudes.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtro]);

    useEffect(() => { cargar(); }, [cargar]);

    const confirmarAprobar = async () => {
        const solicitud = modalAprobar;
        setModalAprobar(null);
        setProcesando(solicitud.idSolicitud);
        try {
            await solicitudNegocioService.aprobar(solicitud.idSolicitud);
            toast.exito(`"${solicitud.nombreNegocio}" fue aprobado. El usuario ya es administrador de su negocio.`);
            cargar();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudo aprobar la solicitud.');
        } finally {
            setProcesando(null);
        }
    };

    const confirmarRechazar = async () => {
        if (!motivoRechazo.trim() || motivoRechazo.trim().length < 5) {
            toast.error('Escribe un motivo de al menos 5 caracteres.');
            return;
        }
        const solicitud = modalRechazar;
        const motivo = motivoRechazo.trim();
        setModalRechazar(null);
        setMotivoRechazo('');
        setProcesando(solicitud.idSolicitud);
        try {
            await solicitudNegocioService.rechazar(solicitud.idSolicitud, motivo);
            toast.exito('Solicitud rechazada. Se notificó al usuario.');
            cargar();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudo rechazar la solicitud.');
        } finally {
            setProcesando(null);
        }
    };

    const fechaLegible = (fecha) => {
        if (!fecha) return '';
        return new Date(fecha).toLocaleDateString('es-CO', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
    };

    const inicialesDe = (s) => {
        const n = s.solicitante?.nombres?.[0] || '';
        const a = s.solicitante?.apellidos?.[0] || '';
        return ((n + a).toUpperCase()) || 'U';
    };

    return (
        <div className="sn">
            {/* Cabecera */}
            <div className="sn-cabecera">
                <div className="sn-cabecera-titulo">
                    <div className="sn-cabecera-icono"><Store size={24} /></div>
                    <div>
                        <h1>Solicitudes de negocio</h1>
                        <p>Aprueba o rechaza a quienes quieren unirse a ProdVen como negocio.</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="sn-filtros">
                {FILTROS.map((f) => (
                    <button
                        key={f.valor}
                        className={`sn-filtro ${filtro === f.valor ? 'sn-filtro-activo' : ''}`}
                        onClick={() => setFiltro(f.valor)}
                    >
                        {f.etiqueta}
                    </button>
                ))}
            </div>

            {/* Lista */}
            {cargando ? (
                <div className="sn-cargando">
                    <Loader2 size={30} className="sn-girando" />
                    <p>Cargando solicitudes...</p>
                </div>
            ) : solicitudes.length === 0 ? (
                <div className="sn-vacio">
                    <div className="sn-vacio-icono"><Inbox size={34} /></div>
                    <h3>No hay solicitudes {filtro === 'pendiente' ? 'pendientes' : filtro === 'aprobada' ? 'aprobadas' : 'rechazadas'}</h3>
                    <p>Cuando lleguen nuevas solicitudes, aparecerán aquí.</p>
                </div>
            ) : (
                <div className="sn-lista">
                    {solicitudes.map((s, idx) => (
                        <div className="sn-card" key={s.idSolicitud} style={{ '--i': idx }}>
                            <div className="sn-card-top">
                                <div className="sn-negocio">
                                    <div className="sn-negocio-icono"><Building2 size={20} /></div>
                                    <div>
                                        <h3>{s.nombreNegocio}</h3>
                                        {s.categoria && (
                                            <span className="sn-categoria"><Tag size={12} /> {s.categoria}</span>
                                        )}
                                    </div>
                                </div>
                                <span className={`sn-estado sn-estado-${s.estado}`}>
                                    {s.estado === 'pendiente' && <><Clock size={13} /> Pendiente</>}
                                    {s.estado === 'aprobada' && <><Check size={13} /> Aprobada</>}
                                    {s.estado === 'rechazada' && <><X size={13} /> Rechazada</>}
                                </span>
                            </div>

                            {s.descripcion && (
                                <p className="sn-descripcion">{s.descripcion}</p>
                            )}

                            <div className="sn-datos">
                                <div className="sn-solicitante">
                                    <span className="sn-avatar">{inicialesDe(s)}</span>
                                    <div className="sn-solicitante-info">
                                        <strong>
                                            <User size={12} /> {s.solicitante?.nombres} {s.solicitante?.apellidos}
                                        </strong>
                                        <span><Mail size={12} /> {s.solicitante?.correo || '—'}</span>
                                    </div>
                                </div>
                                <div className="sn-meta">
                                    {(s.telefono || s.solicitante?.telefono) && (
                                        <span><Phone size={13} /> {s.telefono || s.solicitante?.telefono}</span>
                                    )}
                                    {(s.ciudad || s.departamento) && (
                                        <span><MapPin size={13} /> {[s.ciudad, s.departamento].filter(Boolean).join(', ')}</span>
                                    )}
                                    <span><Clock size={13} /> {fechaLegible(s.fechaCreacion)}</span>
                                </div>
                            </div>

                            {/* Motivo de rechazo si aplica */}
                            {s.estado === 'rechazada' && s.motivoRechazo && (
                                <div className="sn-motivo">
                                    <AlertTriangle size={14} /> <span><strong>Motivo:</strong> {s.motivoRechazo}</span>
                                </div>
                            )}

                            {/* Acciones solo para pendientes */}
                            {s.estado === 'pendiente' && (
                                <div className="sn-acciones">
                                    <button
                                        className="sn-btn-rechazar"
                                        onClick={() => { setModalRechazar(s); setMotivoRechazo(''); }}
                                        disabled={procesando === s.idSolicitud}
                                    >
                                        <X size={16} /> Rechazar
                                    </button>
                                    <button
                                        className="sn-btn-aprobar"
                                        onClick={() => setModalAprobar(s)}
                                        disabled={procesando === s.idSolicitud}
                                    >
                                        {procesando === s.idSolicitud
                                            ? (<><Loader2 size={16} className="sn-girando" /> Procesando...</>)
                                            : (<><Check size={16} /> Aprobar</>)}
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ===== MODAL APROBAR ===== */}
            {modalAprobar && (
                <div className="sn-modal-fondo" onClick={() => setModalAprobar(null)}>
                    <div className="sn-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sn-modal-icono sn-modal-icono-ok"><ShieldCheck size={28} /></div>
                        <h3>Aprobar solicitud</h3>
                        <p>
                            Vas a aprobar <strong>{modalAprobar.nombreNegocio}</strong>. Se creará su empresa
                            y <strong>{modalAprobar.solicitante?.nombres}</strong> pasará de cliente a
                            administrador de su negocio. Su cuenta de cliente dejará de funcionar como tal.
                        </p>
                        <div className="sn-modal-acciones">
                            <button className="sn-modal-cancelar" onClick={() => setModalAprobar(null)}>
                                Cancelar
                            </button>
                            <button className="sn-modal-confirmar-ok" onClick={confirmarAprobar}>
                                <Check size={17} /> Sí, aprobar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ===== MODAL RECHAZAR ===== */}
            {modalRechazar && (
                <div className="sn-modal-fondo" onClick={() => setModalRechazar(null)}>
                    <div className="sn-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="sn-modal-icono sn-modal-icono-no"><X size={28} /></div>
                        <h3>Rechazar solicitud</h3>
                        <p>
                            Vas a rechazar <strong>{modalRechazar.nombreNegocio}</strong>. El usuario seguirá
                            siendo cliente y recibirá el motivo que escribas.
                        </p>
                        <textarea
                            className="sn-modal-textarea"
                            placeholder="Motivo del rechazo (lo verá el usuario)..."
                            value={motivoRechazo}
                            onChange={(e) => setMotivoRechazo(e.target.value)}
                            rows={3}
                            maxLength={300}
                            autoFocus
                        />
                        <div className="sn-modal-acciones">
                            <button className="sn-modal-cancelar" onClick={() => { setModalRechazar(null); setMotivoRechazo(''); }}>
                                Cancelar
                            </button>
                            <button className="sn-modal-confirmar-no" onClick={confirmarRechazar}>
                                <X size={17} /> Rechazar solicitud
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default SolicitudesNegocio;