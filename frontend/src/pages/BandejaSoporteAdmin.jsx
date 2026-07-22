import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import mensajeriaService from '../services/mensajeriaService';
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { Search, Inbox, Send, User, Clock, RotateCw, ChevronDown, LifeBuoy, ArrowLeft, AlertCircle, ShieldAlert } from 'lucide-react';
import './BandejaVendedor.css';

const INTERVALO_POLLING_MS = 45000;
const UMBRAL_CERCA_DEL_FONDO_PX = 120;
const DURACION_TOAST_MS = 4000;
const UMBRAL_AGRUPACION_MS = 3 * 60 * 1000;

const extraerDatos = (respuesta) => respuesta?.data ?? null;

const ETIQUETA_ROL = {
    cliente: 'Cliente',
    administrador: 'Administrador de tienda',
    vendedor: 'Vendedor',
    produccion: 'Producción',
    supervisor: 'Supervisor',
    domiciliario: 'Domiciliario'
};

const BandejaSoporteAdmin = () => {
    const { idConversacion: idConversacionUrl } = useParams();
    const { usuario } = useAuth();
    const idUsuarioActual = usuario?.idUsuario;
    const esSuperAdmin = usuario?.rol === 'superadmin';

    const [conversaciones, setConversaciones] = useState([]);
    const [busqueda, setBusqueda] = useState('');
    const [cargandoLista, setCargandoLista] = useState(true);
    const [errorLista, setErrorLista] = useState(null);

    const [chatActivo, setChatActivo] = useState(null);
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [cargandoChat, setCargandoChat] = useState(false);

    const [toast, setToast] = useState(null);
    const [hayMensajesNuevos, setHayMensajesNuevos] = useState(false);
    const [anuncioAccesible, setAnuncioAccesible] = useState('');

    const montadoRef = useRef(true);
    const finDeChatRef = useRef(null);
    const cuerpoRef = useRef(null);
    const pollingListaRef = useRef(null);
    const pollingChatRef = useRef(null);
    const cercaDelFondoRef = useRef(true);
    const contadorTemporalRef = useRef(0);
    const ultimoIdVistoRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const chatActivoIdRef = useRef(null);
    const primeraCargaListaRef = useRef(true);
    const cargarConversacionesRef = useRef(null);
    const cargarMensajesChatRef = useRef(null);
    const autoSeleccionadoRef = useRef(false)
    const esMensajeMio = useCallback(
        (msg) => msg.idRemitente === idUsuarioActual,
        [idUsuarioActual]
    );

    const mostrarError = useCallback((mensaje) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast(mensaje);
        toastTimeoutRef.current = setTimeout(() => {
            if (montadoRef.current) setToast(null);
        }, DURACION_TOAST_MS);
    }, []);

    const scrollAlFondo = useCallback((comportamiento = 'smooth') => {
        if (finDeChatRef.current) {
            finDeChatRef.current.scrollIntoView({ behavior: comportamiento });
        }
        setHayMensajesNuevos(false);
    }, []);

    const manejarScrollCuerpo = () => {
        const el = cuerpoRef.current;
        if (!el) return;
        const distanciaAlFondo = el.scrollHeight - el.scrollTop - el.clientHeight;
        cercaDelFondoRef.current = distanciaAlFondo < UMBRAL_CERCA_DEL_FONDO_PX;
        if (cercaDelFondoRef.current) setHayMensajesNuevos(false);
    };

    const cargarConversaciones = useCallback(async () => {
        if (!esSuperAdmin) return;
        try {
            const respuesta = await mensajeriaService.listarConversaciones(null, 'soporte');
            if (!montadoRef.current) return;

            const datos = extraerDatos(respuesta);
            const lista = Array.isArray(datos?.conversaciones) ? datos.conversaciones : [];

            setErrorLista(null);
            setConversaciones((prev) => {
                const firmaNueva = lista.map((c) => `${c.idConversacion}:${c.fechaUltimoMensaje}:${c.noLeidos || 0}`).join('|');
                const firmaAnterior = prev.map((c) => `${c.idConversacion}:${c.fechaUltimoMensaje}:${c.noLeidos || 0}`).join('|');
                return firmaNueva !== firmaAnterior ? lista : prev;
            });
        } catch (err) {
            if (!montadoRef.current) return;
            if (primeraCargaListaRef.current) {
                setErrorLista('No pudimos cargar los tickets de soporte.');
            }
        } finally {
            if (montadoRef.current) {
                setCargandoLista(false);
                primeraCargaListaRef.current = false;
            }
        }
    }, [esSuperAdmin]);

    cargarConversacionesRef.current = cargarConversaciones;

    const cargarMensajesChat = useCallback(async (idConversacion, esCargaInicial = false) => {
        try {
            if (esCargaInicial) setCargandoChat(true);
            const resMensajes = await mensajeriaService.listarMensajes(idConversacion, 1, 100);

            if (!montadoRef.current || chatActivoIdRef.current !== idConversacion) return;

            const datosMensajes = extraerDatos(resMensajes);
            const listaServidor = datosMensajes?.mensajes || (Array.isArray(datosMensajes) ? datosMensajes : []);

            setMensajes((prev) => {
                const temporales = prev.filter((m) => typeof m.idMensaje === 'string' && m.idMensaje.startsWith('temp-'));
                const pendientesLocales = temporales.filter(
                    (temp) => !listaServidor.some((sv) => sv.idRemitente === idUsuarioActual && sv.contenido === temp.contenido)
                );

                const combinado = [...listaServidor, ...pendientesLocales];

                const firmaNueva = combinado.map((m) => `${m.idMensaje}:${m._estado || ''}`).join('|');
                const firmaAnterior = prev.map((m) => `${m.idMensaje}:${m._estado || ''}`).join('|');
                if (firmaNueva === firmaAnterior) return prev;

                const ultimoMensaje = combinado[combinado.length - 1];
                const esNuevoDelSolicitante =
                    ultimoMensaje &&
                    ultimoMensaje.idMensaje !== ultimoIdVistoRef.current &&
                    ultimoMensaje.idRemitente !== idUsuarioActual;

                if (ultimoMensaje) ultimoIdVistoRef.current = ultimoMensaje.idMensaje;
                if (esNuevoDelSolicitante) setAnuncioAccesible(ultimoMensaje.contenido || 'Nuevo mensaje');

                const debeAutoScroll = esCargaInicial || cercaDelFondoRef.current;
                setTimeout(() => {
                    if (debeAutoScroll) scrollAlFondo(esCargaInicial ? 'auto' : 'smooth');
                    else setHayMensajesNuevos(true);
                }, 80);

                return combinado;
            });

           mensajeriaService.marcarLeidos(idConversacion).catch(() => {});
        } catch (err) {
            if (!esCargaInicial) mostrarError('Problemas de conexión actualizando el chat.');
        } finally {
            if (montadoRef.current && esCargaInicial && chatActivoIdRef.current === idConversacion) {
                setCargandoChat(false);
            }
        }
    }, [idUsuarioActual, mostrarError, scrollAlFondo]);

    cargarMensajesChatRef.current = cargarMensajesChat;

    useEffect(() => {
        if (!esSuperAdmin) return undefined;
        montadoRef.current = true;
        cargarConversaciones();

        const manejarVisibilidad = () => {
            if (document.hidden) {
                if (pollingListaRef.current) clearInterval(pollingListaRef.current);
            } else {
                cargarConversaciones();
                pollingListaRef.current = setInterval(cargarConversaciones, INTERVALO_POLLING_MS);
            }
        };

        if (!document.hidden) {
            pollingListaRef.current = setInterval(cargarConversaciones, INTERVALO_POLLING_MS);
        }
        document.addEventListener('visibilitychange', manejarVisibilidad);

        return () => {
            montadoRef.current = false;
            if (pollingListaRef.current) clearInterval(pollingListaRef.current);
            document.removeEventListener('visibilitychange', manejarVisibilidad);
        };
    }, [esSuperAdmin, cargarConversaciones]);

    useEffect(() => {
        if (!idConversacionUrl || autoSeleccionadoRef.current) return;
        const chat = conversaciones.find((c) => c.idConversacion === idConversacionUrl);
        if (chat) {
            autoSeleccionadoRef.current = true;
            seleccionarChat(chat);
        }
    }, [idConversacionUrl, conversaciones]);

    useEffect(() => {
        chatActivoIdRef.current = chatActivo?.idConversacion || null;

        if (!chatActivo) {
            if (pollingChatRef.current) clearInterval(pollingChatRef.current);
            return undefined;
        }

        const idConv = chatActivo.idConversacion;
        cargarMensajesChat(idConv, true);

        const manejarVisibilidad = () => {
            if (document.hidden) {
                if (pollingChatRef.current) clearInterval(pollingChatRef.current);
            } else {
                cargarMensajesChat(idConv, false);
                pollingChatRef.current = setInterval(() => cargarMensajesChat(idConv, false), INTERVALO_POLLING_MS);
            }
        };

        if (!document.hidden) {
            pollingChatRef.current = setInterval(() => cargarMensajesChat(idConv, false), INTERVALO_POLLING_MS);
        }
        document.addEventListener('visibilitychange', manejarVisibilidad);

        return () => {
            if (pollingChatRef.current) clearInterval(pollingChatRef.current);
            document.removeEventListener('visibilitychange', manejarVisibilidad);
        };
    }, [chatActivo?.idConversacion, cargarMensajesChat]);

    useEffect(() => {
        const socket = socketService.obtenerSocket();
        if (!socket) return undefined;

        const alRecibirMensaje = (mensaje) => {
            if (mensaje?.idConversacion === chatActivoIdRef.current) {
                cargarMensajesChatRef.current(mensaje.idConversacion, false);
            }
        };

        const alActualizarNotificacion = () => {
            cargarConversacionesRef.current();
        };

        socket.on('mensaje_nuevo', alRecibirMensaje);
        socket.on('notificacion_actualizada', alActualizarNotificacion);

        return () => {
            socket.off('mensaje_nuevo', alRecibirMensaje);
            socket.off('notificacion_actualizada', alActualizarNotificacion);
        };
    }, []);

    useEffect(() => {
        if (!chatActivo) return undefined;
        const socket = socketService.obtenerSocket();
        if (!socket) return undefined;

        socket.emit('unirse_conversacion', chatActivo.idConversacion);
        return () => {
            socket.emit('salir_conversacion', chatActivo.idConversacion);
        };
    }, [chatActivo?.idConversacion]);

    const seleccionarChat = (chat) => {
        if (chatActivoIdRef.current === chat.idConversacion) return;

        setChatActivo(chat);
        setMensajes([]);
        setHayMensajesNuevos(false);
        setAnuncioAccesible('');
        cercaDelFondoRef.current = true;
        ultimoIdVistoRef.current = null;
        if (cuerpoRef.current) cuerpoRef.current.scrollTop = 0;

        setConversaciones((prev) =>
            prev.map((c) => (c.idConversacion === chat.idConversacion ? { ...c, noLeidos: 0 } : c))
        );
    };

    const volverALaLista = () => {
        setChatActivo(null);
    };

    const enviarConEstado = useCallback(async (contenido, idTemporal, idConv) => {
        try {
            await mensajeriaService.enviarMensaje(idConv, {
                contenido,
                tipoContenido: 'texto'
            });

            if (!montadoRef.current || chatActivoIdRef.current !== idConv) return;

            setMensajes((prev) => prev.filter((m) => m.idMensaje !== idTemporal));
            await cargarMensajesChat(idConv, false);
            cargarConversaciones();
        } catch (err) {
            if (!montadoRef.current || chatActivoIdRef.current !== idConv) return;
            setMensajes((prev) => prev.map((m) => (m.idMensaje === idTemporal ? { ...m, _estado: 'error' } : m)));
            mostrarError('No se pudo enviar. Toca el mensaje para reintentar.');
        }
    }, [cargarMensajesChat, cargarConversaciones, mostrarError]);

    const handleEnviarMensaje = (e) => {
        e.preventDefault();
        const textoLimpio = nuevoMensaje.trim();
        if (!textoLimpio || !chatActivo) return;

        const idTemporal = `temp-${Date.now()}-${contadorTemporalRef.current++}`;
        const currentChatId = chatActivo.idConversacion;

        setMensajes((prev) => [
            ...prev,
            {
                idMensaje: idTemporal,
                idRemitente: idUsuarioActual,
                contenido: textoLimpio,
                fechaCreacion: new Date().toISOString(),
                _estado: 'enviando'
            }
        ]);
        setNuevoMensaje('');
        cercaDelFondoRef.current = true;
        setTimeout(() => scrollAlFondo('smooth'), 50);

        enviarConEstado(textoLimpio, idTemporal, currentChatId);
    };

    const handleReintentar = (mensaje) => {
        if (mensaje._estado !== 'error' || !chatActivo) return;
        setMensajes((prev) => prev.map((m) => (m.idMensaje === mensaje.idMensaje ? { ...m, _estado: 'enviando' } : m)));
        enviarConEstado(mensaje.contenido, mensaje.idMensaje, chatActivo.idConversacion);
    };

    const handleTeclaReintentar = (e, mensaje) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleReintentar(mensaje);
        }
    };

    const formatearHora = (fechaString) => {
        if (!fechaString) return '';
        return new Date(fechaString).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    };

    const formatearSeparadorFecha = (fecha) => {
        const hoy = new Date();
        const ayer = new Date();
        ayer.setDate(hoy.getDate() - 1);
        if (fecha.toDateString() === hoy.toDateString()) return 'Hoy';
        if (fecha.toDateString() === ayer.toDateString()) return 'Ayer';
        return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    const construirFilas = (lista) => {
        const resultado = [];
        let claveFechaAnterior = null;
        let mensajeAnteriorMismoDia = null;

        lista.forEach((msg, index) => {
            const fechaMsg = new Date(msg.fechaCreacion || Date.now());
            const claveFecha = fechaMsg.toDateString();
            const huboSeparador = claveFecha !== claveFechaAnterior;

            if (huboSeparador) {
                resultado.push({ tipo: 'separador', key: `sep-${claveFecha}-${index}`, texto: formatearSeparadorFecha(fechaMsg) });
                claveFechaAnterior = claveFecha;
                mensajeAnteriorMismoDia = null;
            }

            const gapMs = mensajeAnteriorMismoDia
                ? fechaMsg - new Date(mensajeAnteriorMismoDia.fechaCreacion || 0)
                : Infinity;

            const esInicioGrupo =
                !mensajeAnteriorMismoDia ||
                mensajeAnteriorMismoDia.idRemitente !== msg.idRemitente ||
                gapMs > UMBRAL_AGRUPACION_MS;

            resultado.push({ tipo: 'mensaje', key: msg.idMensaje, datos: msg, esInicioGrupo });
            mensajeAnteriorMismoDia = msg;
        });

        for (let i = 0; i < resultado.length; i++) {
            if (resultado[i].tipo !== 'mensaje') continue;
            const siguiente = resultado[i + 1];
            resultado[i].esFinGrupo = !siguiente || siguiente.tipo !== 'mensaje' || siguiente.esInicioGrupo;
        }

        return resultado;
    };

    const nombreSolicitante = (chat) => {
        if (!chat.solicitante) return 'Usuario';
        return `${chat.solicitante.nombres || ''} ${chat.solicitante.apellidos || ''}`.trim() || chat.solicitante.correo;
    };

    const etiquetaSolicitante = (chat) => {
        if (!chat.solicitante) return '';
        return ETIQUETA_ROL[chat.solicitante.rol] || chat.solicitante.rol;
    };

    const conversacionesFiltradas = conversaciones.filter((c) => {
        const termino = busqueda.toLowerCase();
        return (
            nombreSolicitante(c).toLowerCase().includes(termino) ||
            (c.ultimoMensaje || '').toLowerCase().includes(termino)
        );
    });

    if (!esSuperAdmin) {
        return (
            <div className="bv-error-full" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <ShieldAlert size={40} />
                <span>Esta sección es exclusiva para superadmin.</span>
            </div>
        );
    }

    return (
        <div className={`bv-layout ${chatActivo ? 'bv-layout--chat-abierto' : ''}`}>

            <aside className="bv-sidebar">
                <div className="bv-sidebar-header">
                    <h2>Soporte ProdVen</h2>
                    <div className="bv-buscador">
                        <Search size={16} className="bv-icono-buscar" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bv-lista-conversaciones">
                    {cargandoLista ? (
                        <div className="bv-estado-vacio"><div className="bv-spinner"></div></div>
                    ) : errorLista && conversaciones.length === 0 ? (
                        <div className="bv-estado-vacio">
                            <AlertCircle size={32} />
                            <p>{errorLista}</p>
                            <button className="bv-btn-reintentar-lista" onClick={cargarConversaciones}>
                                Reintentar
                            </button>
                        </div>
                    ) : conversacionesFiltradas.length === 0 ? (
                        <div className="bv-estado-vacio">
                            <Inbox size={32} />
                            <p>No hay tickets de soporte activos.</p>
                        </div>
                    ) : (
                        conversacionesFiltradas.map((chat) => (
                            <div
                                key={chat.idConversacion}
                                className={`bv-item-chat ${chatActivo?.idConversacion === chat.idConversacion ? 'bv-item-activo' : ''}`}
                                onClick={() => seleccionarChat(chat)}
                            >
                                <div className="bv-item-avatar"><User size={20} /></div>
                                <div className="bv-item-info">
                                    <div className="bv-item-top">
                                        <span className="bv-item-nombre">
                                            {nombreSolicitante(chat)}
                                        </span>
                                        <span className="bv-item-fecha">{formatearHora(chat.fechaUltimoMensaje || chat.fechaCreacion)}</span>
                                    </div>
                                    <p className="bv-item-preview">
                                        {etiquetaSolicitante(chat)}{chat.ultimoMensaje ? ` · ${chat.ultimoMensaje}` : ''}
                                    </p>
                                </div>
                                {chat.noLeidos > 0 && (
                                    <div className="bv-badge-noleido">{chat.noLeidos}</div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </aside>

            <main className="bv-chat-main">
                <div className="bv-sr-solo" aria-live="polite">{anuncioAccesible}</div>

                {toast && (
                    <div className="bv-toast" role="alert">
                        <span>{toast}</span>
                    </div>
                )}

                {!chatActivo ? (
                    <div className="bv-estado-vacio bv-estado-vacio-main">
                        <LifeBuoy size={48} />
                        <h3>Bandeja de soporte</h3>
                        <p>Selecciona un ticket del panel izquierdo para responder.</p>
                    </div>
                ) : (
                    <>
                        <header className="bv-chat-header">
                            <button className="bv-btn-atras-movil" onClick={volverALaLista} aria-label="Volver a la lista">
                                <ArrowLeft size={20} />
                            </button>
                            <div className="bv-chat-header-info">
                                <div className="bv-item-avatar"><User size={20} /></div>
                                <div>
                                    <h2>{nombreSolicitante(chatActivo)}</h2>
                                    <span>{etiquetaSolicitante(chatActivo)} · {chatActivo.solicitante?.correo}</span>
                                </div>
                            </div>
                        </header>

                        <div className="bv-chat-body" ref={cuerpoRef} onScroll={manejarScrollCuerpo}>
                            {cargandoChat ? (
                                <div className="bv-estado-vacio"><div className="bv-spinner"></div></div>
                            ) : mensajes.length === 0 ? (
                                <div className="bv-estado-vacio"><p>No hay mensajes en este ticket.</p></div>
                            ) : (
                                <div className="bv-lista-burbujas">
                                    {construirFilas(mensajes).map((fila) => {
                                        if (fila.tipo === 'separador') {
                                            return <div className="bv-separador-fecha" key={fila.key}><span>{fila.texto}</span></div>;
                                        }

                                        const msg = fila.datos;
                                        const esMio = esMensajeMio(msg);
                                        const esError = msg._estado === 'error';
                                        const estaEnviando = msg._estado === 'enviando';

                                        const claseGrupo = [
                                            'bv-burbuja-wrapper',
                                            esMio ? 'bv-wrapper-mio' : 'bv-wrapper-ajeno',
                                            fila.esInicioGrupo ? 'bv-grupo-inicio' : 'bv-grupo-continua'
                                        ].join(' ');

                                        const claseBurbuja = [
                                            'bv-burbuja',
                                            esMio ? 'bv-burbuja-mia' : 'bv-burbuja-ajena',
                                            esError ? 'bv-burbuja-error' : '',
                                            !fila.esInicioGrupo ? 'bv-burbuja-agrupada-arriba' : '',
                                            !fila.esFinGrupo ? 'bv-burbuja-agrupada-abajo' : ''
                                        ].join(' ').trim();

                                        return (
                                            <div key={fila.key} className={claseGrupo}>
                                                <div
                                                    className={claseBurbuja}
                                                    onClick={esError ? () => handleReintentar(msg) : undefined}
                                                    onKeyDown={esError ? (e) => handleTeclaReintentar(e, msg) : undefined}
                                                    role={esError ? 'button' : undefined}
                                                    tabIndex={esError ? 0 : undefined}
                                                >
                                                    <p className="bv-burbuja-texto">{msg.contenido}</p>
                                                    {fila.esFinGrupo && (
                                                        <span className="bv-burbuja-hora">
                                                            {estaEnviando && <Clock size={11} className="bv-icono-estado" />}
                                                            {esError && <RotateCw size={11} className="bv-icono-estado" />}
                                                            {!estaEnviando && !esError && formatearHora(msg.fechaCreacion)}
                                                        </span>
                                                    )}
                                                    {esError && <span className="bv-burbuja-error-texto">Toca para reintentar</span>}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={finDeChatRef} />
                                </div>
                            )}

                            {hayMensajesNuevos && (
                                <button className="bv-pill-nuevos" onClick={() => scrollAlFondo('smooth')}>
                                    <ChevronDown size={16} /> Nuevos mensajes
                                </button>
                            )}
                        </div>

                        <footer className="bv-chat-footer">
                            <form onSubmit={handleEnviarMensaje} className="bv-formulario">
                                <input
                                    type="text"
                                    className="bv-input-texto"
                                    placeholder="Escribe tu respuesta..."
                                    value={nuevoMensaje}
                                    onChange={(e) => setNuevoMensaje(e.target.value)}
                                    autoComplete="off"
                                    maxLength={2000}
                                />
                                <button type="submit" className="bv-btn-enviar" disabled={!nuevoMensaje.trim()}>
                                    <Send size={18} />
                                </button>
                            </form>
                        </footer>
                    </>
                )}
            </main>
        </div>
    );
};

export default BandejaSoporteAdmin;