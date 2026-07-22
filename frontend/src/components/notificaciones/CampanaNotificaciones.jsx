import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificacionService from '../../services/notificacionService';
import socketService from '../../services/socketService';
import {
    Bell, ShoppingBag, CreditCard, Boxes, MessageCircle,
    Tag, Info, CheckCheck, Loader2, BellOff
} from 'lucide-react';
import './CampanaNotificaciones.css';

const INTERVALO_POLLING = 60000; // Respaldo: Socket.io hace el trabajo en vivo

const CONFIG_TIPO = {
    pedido:    { Icono: ShoppingBag,   clase: 'noti-chip-pedido' },
    pago:      { Icono: CreditCard,    clase: 'noti-chip-pago' },
    inventario:{ Icono: Boxes,         clase: 'noti-chip-inventario' },
    mensaje:   { Icono: MessageCircle, clase: 'noti-chip-mensaje' },
    promocion: { Icono: Tag,           clase: 'noti-chip-promocion' },
    sistema:   { Icono: Info,          clase: 'noti-chip-sistema' }
};

const tiempoRelativo = (fecha) => {
    if (!fecha) return '';
    const ahora = new Date();
    const entonces = new Date(fecha);
    const seg = Math.floor((ahora - entonces) / 1000);

    if (seg < 60) return 'hace un momento';
    const min = Math.floor(seg / 60);
    if (min < 60) return `hace ${min} min`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `hace ${hrs} h`;
    const dias = Math.floor(hrs / 24);
    if (dias < 7) return `hace ${dias} d`;
    return entonces.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
};

function CampanaNotificaciones({ zona = 'cliente' }) {
    const navigate = useNavigate();
    const [abierto, setAbierto] = useState(false);
    const [noLeidas, setNoLeidas] = useState(0);
    const [notificaciones, setNotificaciones] = useState([]);
    const [cargando, setCargando] = useState(false);
    const [marcandoTodas, setMarcandoTodas] = useState(false);
    const panelRef = useRef(null);
    const abiertoRef = useRef(false);

    const cargarConteo = useCallback(async () => {
        try {
            const res = await notificacionService.contarNoLeidas();
            setNoLeidas(res.data?.data?.noLeidas || 0);
        } catch {
            // Silencioso
        }
    }, []);

    const cargarLista = useCallback(async () => {
        setCargando(true);
        try {
            const res = await notificacionService.listar({ limit: 20 });
            setNotificaciones(res.data?.data?.notificaciones || []);
        } catch {
            setNotificaciones([]);
        } finally {
            setCargando(false);
        }
    }, []);

    // Polling de respaldo (baja frecuencia, solo por si el socket se cae)
    useEffect(() => {
        cargarConteo();
        const id = setInterval(cargarConteo, INTERVALO_POLLING);
        return () => clearInterval(id);
    }, [cargarConteo]);

    // Refresco inmediato disparado por acciones locales (ej. al leer un chat)
    useEffect(() => {
        const alActualizar = () => {
            cargarConteo();
            if (abiertoRef.current) cargarLista();
        };
        window.addEventListener('notificaciones-actualizadas', alActualizar);
        return () => window.removeEventListener('notificaciones-actualizadas', alActualizar);
    }, [cargarConteo, cargarLista]);

    // Tiempo real: el backend avisa por socket cuando algo cambió en las
    // notificaciones de este usuario (nueva, actualizada, o leída).
    useEffect(() => {
        const socket = socketService.obtenerSocket();
        if (!socket) return undefined;

        const alActualizar = () => {
            cargarConteo();
            if (abiertoRef.current) cargarLista();
        };

        socket.on('notificacion_actualizada', alActualizar);
        return () => socket.off('notificacion_actualizada', alActualizar);
    }, [cargarConteo, cargarLista]);

    useEffect(() => {
        const alClicFuera = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setAbierto(false);
            }
        };
        document.addEventListener('mousedown', alClicFuera);
        return () => document.removeEventListener('mousedown', alClicFuera);
    }, []);

    const alternarPanel = () => {
        const nuevoEstado = !abierto;
        setAbierto(nuevoEstado);
        abiertoRef.current = nuevoEstado;
        if (nuevoEstado) cargarLista();
    };

    const abrirNotificacion = async (noti) => {
        if (!noti.leida) {
            setNotificaciones((prev) =>
                prev.map((n) =>
                    n.idNotificacion === noti.idNotificacion ? { ...n, leida: true } : n
                )
            );
            setNoLeidas((prev) => Math.max(0, prev - 1));

            try {
                await notificacionService.marcarLeida(noti.idNotificacion);
            } catch {
                cargarConteo();
            }
        }

        setAbierto(false);
        abiertoRef.current = false;
        if (noti.urlAccion) navigate(noti.urlAccion);
    };

    const marcarTodas = async () => {
        if (noLeidas === 0 || marcandoTodas) return;
        setMarcandoTodas(true);

        setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
        setNoLeidas(0);

        try {
            await notificacionService.marcarTodasLeidas();
        } catch {
            cargarConteo();
            cargarLista();
        } finally {
            setMarcandoTodas(false);
        }
    };

    const hayNoLeidas = noLeidas > 0;

    return (
        <div className={`noti ${zona === 'panel' ? 'noti-zona-panel' : 'noti-zona-cliente'}`} ref={panelRef}>
            <button
                className={`noti-btn ${abierto ? 'noti-btn-activo' : ''} ${hayNoLeidas ? 'noti-btn-alerta' : ''}`}
                onClick={alternarPanel}
                aria-label="Notificaciones"
            >
                <Bell size={21} className="noti-btn-icono" />
                {hayNoLeidas && (
                    <span className="noti-badge">
                        {noLeidas > 99 ? '99+' : noLeidas}
                    </span>
                )}
            </button>

            {abierto && (
                <div className="noti-panel">
                    <div className="noti-panel-cabecera">
                        <div className="noti-panel-titulo">
                            <Bell size={17} />
                            <span>Notificaciones</span>
                            {hayNoLeidas && <span className="noti-panel-contador">{noLeidas}</span>}
                        </div>
                        <button
                            className="noti-marcar-todas"
                            onClick={marcarTodas}
                            disabled={!hayNoLeidas || marcandoTodas}
                            title="Marcar todas como leídas"
                        >
                            {marcandoTodas
                                ? <Loader2 size={14} className="noti-girando" />
                                : <CheckCheck size={14} />}
                            <span>Marcar todas</span>
                        </button>
                    </div>

                    <div className="noti-lista">
                        {cargando ? (
                            <div className="noti-cargando">
                                <Loader2 size={26} className="noti-girando" />
                                <p>Cargando...</p>
                            </div>
                        ) : notificaciones.length === 0 ? (
                            <div className="noti-vacio">
                                <div className="noti-vacio-icono"><BellOff size={30} /></div>
                                <p className="noti-vacio-titulo">Todo al día</p>
                                <span className="noti-vacio-sub">No tienes notificaciones por ahora.</span>
                            </div>
                        ) : (
                            notificaciones.map((noti) => {
                                const cfg = CONFIG_TIPO[noti.tipo] || CONFIG_TIPO.sistema;
                                const Icono = cfg.Icono;
                                return (
                                    <button
                                        key={noti.idNotificacion}
                                        className={`noti-item ${!noti.leida ? 'noti-item-no-leida' : ''}`}
                                        onClick={() => abrirNotificacion(noti)}
                                    >
                                        <div className={`noti-chip ${cfg.clase}`}>
                                            <Icono size={18} />
                                        </div>
                                        <div className="noti-item-cuerpo">
                                            <div className="noti-item-titulo">{noti.titulo}</div>
                                            <div className="noti-item-mensaje">{noti.mensaje}</div>
                                            <div className="noti-item-tiempo">{tiempoRelativo(noti.fechaEnvio)}</div>
                                        </div>
                                        {!noti.leida && <span className="noti-punto" />}
                                    </button>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default CampanaNotificaciones;