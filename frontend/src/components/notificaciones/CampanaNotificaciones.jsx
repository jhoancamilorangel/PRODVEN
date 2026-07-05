import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificacionService from '../../services/notificacionService';
import {
    Bell, ShoppingBag, CreditCard, Boxes, MessageCircle,
    Tag, Info, CheckCheck, Loader2, BellOff
} from 'lucide-react';
import './CampanaNotificaciones.css';

/**
 * Campana de Notificaciones (reutilizable)
 *
 * Se usa igual en el marketplace (cliente) y en el panel (negocio).
 * El backend filtra por el usuario del token, así que cada quien ve
 * solo lo suyo. api.js resuelve el token según la zona automáticamente.
 *
 * - Badge con el conteo de no leídas.
 * - Polling cada 60s del contador (ligero, no dispara el rate limiter).
 * - Al abrir el panel, carga la lista completa.
 * - Clic en una notificación: la marca como leída y navega a su urlAccion.
 * - Botón para marcar todas como leídas.
 *
 * @param {string} zona - 'cliente' | 'panel' (reservado para ajustes finos)
 */
const INTERVALO_POLLING = 60000; // 60s

// Config visual por tipo de notificación (ícono + clase de color)
const CONFIG_TIPO = {
    pedido:    { Icono: ShoppingBag,   clase: 'noti-chip-pedido' },
    pago:      { Icono: CreditCard,    clase: 'noti-chip-pago' },
    inventario:{ Icono: Boxes,         clase: 'noti-chip-inventario' },
    mensaje:   { Icono: MessageCircle, clase: 'noti-chip-mensaje' },
    promocion: { Icono: Tag,           clase: 'noti-chip-promocion' },
    sistema:   { Icono: Info,          clase: 'noti-chip-sistema' }
};

/**
 * Convierte una fecha en texto relativo: "hace 5 min", "hace 2 h", etc.
 */
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

    // ---- Contador de no leídas (para el badge) ----
    const cargarConteo = useCallback(async () => {
        try {
            const res = await notificacionService.contarNoLeidas();
            setNoLeidas(res.data?.data?.noLeidas || 0);
        } catch {
            // Silencioso: si falla el conteo, no rompemos el header
        }
    }, []);

    // ---- Lista completa (al abrir el panel) ----
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

    // Polling del conteo mientras el componente esté montado
    useEffect(() => {
        cargarConteo();
        const id = setInterval(cargarConteo, INTERVALO_POLLING);
        return () => clearInterval(id);
    }, [cargarConteo]);

    // Cerrar el panel al hacer clic fuera
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
        if (nuevoEstado) cargarLista(); // cargar solo al abrir
    };

    // Clic en una notificación: marcar leída (optimista) + navegar
    const abrirNotificacion = async (noti) => {
        if (!noti.leida) {
            // Actualización optimista de UI
            setNotificaciones((prev) =>
                prev.map((n) =>
                    n.idNotificacion === noti.idNotificacion ? { ...n, leida: true } : n
                )
            );
            setNoLeidas((prev) => Math.max(0, prev - 1));

            try {
                await notificacionService.marcarLeida(noti.idNotificacion);
            } catch {
                // Si falla, recargamos el conteo real para no desincronizar
                cargarConteo();
            }
        }

        setAbierto(false);
        if (noti.urlAccion) navigate(noti.urlAccion);
    };

    const marcarTodas = async () => {
        if (noLeidas === 0 || marcandoTodas) return;
        setMarcandoTodas(true);

        // Optimista
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
            {/* Botón campana */}
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

            {/* Panel desplegable */}
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