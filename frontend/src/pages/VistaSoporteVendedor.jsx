import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import mensajeriaService from '../services/mensajeriaService';
import socketService from '../services/socketService';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, Send, LifeBuoy, AlertCircle, Clock, RotateCw, ChevronDown } from 'lucide-react';
import './VistaChatCliente.css';

const INTERVALO_POLLING_MS = 45000;
const UMBRAL_CERCA_DEL_FONDO_PX = 120;
const DURACION_TOAST_MS = 4000;
const UMBRAL_AGRUPACION_MS = 3 * 60 * 1000;

const extraerDatos = (respuesta) => respuesta?.data ?? null;

const VistaSoporteVendedor = () => {
    const { idConversacion: idConvUrl } = useParams();
    const navigate = useNavigate();
    const { usuario } = useAuth();
    const idUsuarioActual = usuario?.idUsuario;

    const [idConversacion, setIdConversacion] = useState(idConvUrl || null);
    const [resolviendo, setResolviendo] = useState(!idConvUrl);
    const [mensajes, setMensajes] = useState([]);
    const [nuevoMensaje, setNuevoMensaje] = useState('');
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [hayMensajesNuevos, setHayMensajesNuevos] = useState(false);
    const [anuncioAccesible, setAnuncioAccesible] = useState('');

    const montadoRef = useRef(true);
    const finDeChatRef = useRef(null);
    const cuerpoRef = useRef(null);
    const pollingRef = useRef(null);
    const cercaDelFondoRef = useRef(true);
    const contadorTemporalRef = useRef(0);
    const ultimoIdVistoRef = useRef(null);
    const toastTimeoutRef = useRef(null);
    const cargarDatosChatRef = useRef(null);

    const esMensajeMio = useCallback(
        (msg) => msg.idRemitente === idUsuarioActual,
        [idUsuarioActual]
    );

    const scrollAlFondo = useCallback((comportamiento = 'smooth') => {
        if (finDeChatRef.current) {
            finDeChatRef.current.scrollIntoView({ behavior: comportamiento });
        }
        setHayMensajesNuevos(false);
    }, []);

    const mostrarError = useCallback((mensaje) => {
        if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
        setToast(mensaje);
        toastTimeoutRef.current = setTimeout(() => {
            if (montadoRef.current) setToast(null);
        }, DURACION_TOAST_MS);
    }, []);

    useEffect(() => {
        // Un superadmin no debe crear tickets de soporte a sí mismo: esta
        // pantalla es para vendedores/administradores que necesitan ayuda,
        // no para quien responde el soporte. Si un superadmin llega aquí
        // (ej. por sesión cruzada entre pestañas), lo mandamos a su bandeja.
        if (usuario?.rol === 'superadmin') {
            navigate('/soporte-admin', { replace: true });
            return;
        }

        if (idConvUrl || !idUsuarioActual) {
            setResolviendo(false);
            return;
        }

        let cancelado = false;

        const resolverConversacion = async () => {
            try {
                const respuesta = await mensajeriaService.listarConversaciones(null, 'soporte');
                const datos = extraerDatos(respuesta);
                const existentes = Array.isArray(datos?.conversaciones) ? datos.conversaciones : [];

                let idResuelto = existentes[0]?.idConversacion || null;

                if (!idResuelto) {
                    const nuevo = await mensajeriaService.crearConversacion({
                        tipo: 'soporte',
                        asunto: 'Soporte ProdVen',
                        rolCreador: usuario.rol,
                        participantes: []
                    });
                    idResuelto = nuevo?.data?.idConversacion;
                }

                if (cancelado) return;

                if (idResuelto) {
                    setIdConversacion(idResuelto);
                    navigate(`/soporte-negocio/${idResuelto}`, { replace: true });
                } else {
                    setError('No pudimos abrir tu chat de soporte. Intenta nuevamente.');
                    setCargando(false);
                }
            } catch (err) {
                if (cancelado) return;
                setError(err.message || 'No pudimos abrir tu chat de soporte. Intenta nuevamente.');
                setCargando(false);
            } finally {
                if (!cancelado) setResolviendo(false);
            }
        };

        resolverConversacion();
        return () => { cancelado = true; };
    }, [idConvUrl, idUsuarioActual, usuario, navigate]);

    const idsTemporales = (lista) =>
        lista.filter((m) => typeof m.idMensaje === 'string' && m.idMensaje.startsWith('temp-'));

    const calcularFirma = (lista) =>
        lista.map((m) => `${m.idMensaje}:${m.contenido}:${m._estado || ``}`).join('|');

    const cargarDatosChat = useCallback(async (esCargaInicial = false) => {
        if (!idConversacion) return;
        try {
            if (esCargaInicial) setError(null);

            const resMensajes = await mensajeriaService.listarMensajes(idConversacion, 1, 100);
            if (!montadoRef.current) return;

            const datosMensajes = extraerDatos(resMensajes);
            const listaServidor = datosMensajes?.mensajes || (Array.isArray(datosMensajes) ? datosMensajes : []);

            setMensajes((prev) => {
                const pendientesLocales = idsTemporales(prev).filter(
                    (temp) =>
                        !listaServidor.some(
                            (sv) => sv.idRemitente === idUsuarioActual && sv.contenido === temp.contenido
                        )
                );

                const combinado = [...listaServidor, ...pendientesLocales];

                const firmaNueva = calcularFirma(combinado);
                const firmaAnterior = calcularFirma(prev);
                if (firmaNueva === firmaAnterior) return prev;

                const ultimoMensaje = combinado[combinado.length - 1];
                const esMensajeNuevoAjeno =
                    ultimoMensaje &&
                    ultimoMensaje.idMensaje !== ultimoIdVistoRef.current &&
                    ultimoMensaje.idRemitente !== idUsuarioActual;

                if (ultimoMensaje) ultimoIdVistoRef.current = ultimoMensaje.idMensaje;
                if (esMensajeNuevoAjeno) setAnuncioAccesible(ultimoMensaje.contenido || 'Nuevo mensaje');

                const debeAutoScroll = esCargaInicial || cercaDelFondoRef.current;
                setTimeout(() => {
                    if (debeAutoScroll) scrollAlFondo(esCargaInicial ? 'auto' : 'smooth');
                    else setHayMensajesNuevos(true);
                }, 80);

                return combinado;
            });

            if (esCargaInicial) {
                mensajeriaService.marcarLeidos(idConversacion).catch(() => {});
            }
        } catch (err) {
            if (!montadoRef.current) return;
            if (esCargaInicial) {
                setError(err.message || 'No pudimos cargar tu chat de soporte.');
            } else {
                mostrarError('Se perdió la conexión con el chat. Reintentando...');
            }
        } finally {
            if (montadoRef.current && esCargaInicial) setCargando(false);
        }
    }, [idConversacion, idUsuarioActual, mostrarError, scrollAlFondo]);

    cargarDatosChatRef.current = cargarDatosChat;

    useEffect(() => {
        if (resolviendo || !idConversacion) return undefined;
        montadoRef.current = true;

        cargarDatosChat(true);

        const iniciarPolling = () => {
            if (pollingRef.current) clearInterval(pollingRef.current);
            pollingRef.current = setInterval(() => cargarDatosChat(false), INTERVALO_POLLING_MS);
        };

        const manejarVisibilidad = () => {
            if (document.hidden) {
                if (pollingRef.current) clearInterval(pollingRef.current);
            } else {
                cargarDatosChat(false);
                iniciarPolling();
            }
        };

        iniciarPolling();
        document.addEventListener('visibilitychange', manejarVisibilidad);

        return () => {
            montadoRef.current = false;
            if (pollingRef.current) clearInterval(pollingRef.current);
            if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
            document.removeEventListener('visibilitychange', manejarVisibilidad);
        };
    }, [cargarDatosChat, resolviendo, idConversacion]);

    useEffect(() => {
        if (!idConversacion) return undefined;
        const socket = socketService.obtenerSocket();
        if (!socket) return undefined;

        socket.emit('unirse_conversacion', idConversacion);

        const alRecibirMensaje = (mensaje) => {
            if (mensaje?.idConversacion === idConversacion) {
                cargarDatosChatRef.current(false);
            }
        };

        socket.on('mensaje_nuevo', alRecibirMensaje);

        return () => {
            socket.off('mensaje_nuevo', alRecibirMensaje);
            socket.emit('salir_conversacion', idConversacion);
        };
    }, [idConversacion]);

    const manejarScrollCuerpo = () => {
        const el = cuerpoRef.current;
        if (!el) return;
        const distanciaAlFondo = el.scrollHeight - el.scrollTop - el.clientHeight;
        cercaDelFondoRef.current = distanciaAlFondo < UMBRAL_CERCA_DEL_FONDO_PX;
        if (cercaDelFondoRef.current) setHayMensajesNuevos(false);
    };

    const enviarConEstado = useCallback(async (contenido, idTemporal) => {
        try {
            await mensajeriaService.enviarMensaje(idConversacion, {
                contenido,
                tipoContenido: 'texto'
            });
            if (!montadoRef.current) return;

            setMensajes((prev) => prev.filter((m) => m.idMensaje !== idTemporal));
            await cargarDatosChat(false);
        } catch (err) {
            if (!montadoRef.current) return;
            setMensajes((prev) =>
                prev.map((m) => (m.idMensaje === idTemporal ? { ...m, _estado: 'error' } : m))
            );
            mostrarError('No se pudo enviar el mensaje. Toca el mensaje para reintentar.');
        }
    }, [idConversacion, cargarDatosChat, mostrarError]);

    const handleEnviarMensaje = (e) => {
        e.preventDefault();
        const textoLimpio = nuevoMensaje.trim();
        if (!textoLimpio || !idConversacion) return;

        const idTemporal = `temp-${Date.now()}-${contadorTemporalRef.current++}`;
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

        enviarConEstado(textoLimpio, idTemporal);
    };

    const handleReintentar = (mensaje) => {
        if (mensaje._estado !== 'error') return;
        setMensajes((prev) =>
            prev.map((m) => (m.idMensaje === mensaje.idMensaje ? { ...m, _estado: 'enviando' } : m))
        );
        enviarConEstado(mensaje.contenido, mensaje.idMensaje);
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
        return fecha.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
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
                resultado.push({
                    tipo: 'separador',
                    key: `sep-${claveFecha}-${index}`,
                    texto: formatearSeparadorFecha(fechaMsg)
                });
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

    if (cargando || resolviendo) {
        return (
            <div className="chat-cliente-pantalla-carga">
                <div className="chat-cliente-spinner"></div>
                <p>Conectando con soporte...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="chat-cliente-pantalla-error">
                <AlertCircle size={48} />
                <h2>Oops, algo salió mal</h2>
                <p>{error}</p>
                <button onClick={() => navigate('/dashboard')} className="chat-btn-volver-error">
                    Volver al dashboard
                </button>
            </div>
        );
    }

    const filasRenderizadas = construirFilas(mensajes);

    return (
        <div className="chat-cliente-layout">
            <header className="chat-cliente-header">
                <button onClick={() => navigate(-1)} className="chat-btn-atras" aria-label="Volver">
                    <ArrowLeft size={20} />
                </button>
                <div className="chat-header-info">
                    <div className="chat-avatar-tienda">
                        <LifeBuoy size={20} />
                    </div>
                    <div className="chat-textos-header">
                        <h2>Soporte ProdVen</h2>
                        <span>Estamos para ayudarte</span>
                    </div>
                </div>
            </header>

            <div className="chat-sr-solo" aria-live="polite">{anuncioAccesible}</div>

            {toast && (
                <div className="chat-toast" role="alert">
                    <AlertCircle size={16} />
                    <span>{toast}</span>
                </div>
            )}

            <main className="chat-cliente-body" ref={cuerpoRef} onScroll={manejarScrollCuerpo}>
                {mensajes.length === 0 ? (
                    <div className="chat-cliente-vacio">
                        <p>Cuéntanos en qué podemos ayudarte con tu negocio.</p>
                    </div>
                ) : (
                    <div className="chat-lista-burbujas">
                        {filasRenderizadas.map((fila) => {
                            if (fila.tipo === 'separador') {
                                return (
                                    <div className="chat-separador-fecha" key={fila.key}>
                                        <span>{fila.texto}</span>
                                    </div>
                                );
                            }

                            const msg = fila.datos;
                            const esMio = esMensajeMio(msg);
                            const esError = msg._estado === 'error';
                            const estaEnviando = msg._estado === 'enviando';

                            const claseGrupo = [
                                'chat-burbuja-wrapper',
                                esMio ? 'wrapper-mio' : 'wrapper-ajeno',
                                fila.esInicioGrupo ? 'grupo-inicio' : 'grupo-continua'
                            ].join(' ');

                            const claseBurbuja = [
                                'chat-burbuja',
                                esMio ? 'burbuja-mia' : 'burbuja-ajena',
                                esError ? 'burbuja-error' : '',
                                !fila.esInicioGrupo ? 'burbuja-agrupada-arriba' : '',
                                !fila.esFinGrupo ? 'burbuja-agrupada-abajo' : ''
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
                                        <p className="chat-burbuja-texto">{msg.contenido}</p>
                                        {fila.esFinGrupo && (
                                            <span className="chat-burbuja-hora">
                                                {estaEnviando && <Clock size={11} className="chat-icono-estado" />}
                                                {esError && <RotateCw size={11} className="chat-icono-estado" />}
                                                {!estaEnviando && !esError && formatearHora(msg.fechaCreacion)}
                                            </span>
                                        )}
                                        {esError && (
                                            <span className="chat-burbuja-error-texto">
                                                No se pudo enviar · Toca para reintentar
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        <div ref={finDeChatRef} />
                    </div>
                )}

                {hayMensajesNuevos && (
                    <button className="chat-pill-nuevos" onClick={() => scrollAlFondo('smooth')}>
                        <ChevronDown size={16} />
                        Nuevos mensajes
                    </button>
                )}
            </main>

            <footer className="chat-cliente-footer">
                <form onSubmit={handleEnviarMensaje} className="chat-formulario">
                    <input
                        type="text"
                        className="chat-input-texto"
                        placeholder="Escribe tu mensaje..."
                        value={nuevoMensaje}
                        onChange={(e) => setNuevoMensaje(e.target.value)}
                        autoComplete="off"
                        maxLength={2000}
                    />
                    <button
                        type="submit"
                        className="chat-btn-enviar"
                        disabled={!nuevoMensaje.trim()}
                        aria-label="Enviar mensaje"
                    >
                        <Send size={18} />
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default VistaSoporteVendedor;