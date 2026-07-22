import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import mensajeriaService from '../../services/mensajeriaService';
import './BotonChatCliente.css';

/**
 * BotonChatCliente
 * ------------------------------------------------------------------
 * Notas de diseño / decisiones documentadas:
 * - El identificador del cliente NUNCA se envía en el payload de
 *   crearConversacion; el backend lo extrae del JWT.
 * - Este componente cubre exclusivamente el canal cliente -> tienda.
 * - La navegación incluye idEmpresa en la URL porque, para un
 *   Cliente, req.tenantId viene NULL en el backend (un cliente no
 *   pertenece a una sola empresa fija, compra en varias tiendas).
 *   Sin idEmpresa explícito en la URL, VistaChatCliente no puede
 *   pasarlo a obtenerConversacion y el backend responde 400.
 */

const DURACION_TOAST_MS = 4000;
const DURACION_ANIMACION_SALIDA_MS = 300;

const BotonChatCliente = ({ idEmpresa, nombreEmpresa }) => {
    const [cargando, setCargando] = useState(false);
    const [toast, setToast] = useState(null);
    const navigate = useNavigate();
    const timeoutOcultarRef = useRef(null);
    const timeoutRemoverRef = useRef(null);
    const montadoRef = useRef(true);

    useEffect(() => {
        montadoRef.current = true;
        return () => {
            montadoRef.current = false;
            if (timeoutOcultarRef.current) clearTimeout(timeoutOcultarRef.current);
            if (timeoutRemoverRef.current) clearTimeout(timeoutRemoverRef.current);
        };
    }, []);

    const traducirError = (error) => {
    // Si no hay token de cliente en absoluto, el problema es previo a
    // cualquier petición HTTP: no hay sesión iniciada como cliente.
    if (!sessionStorage.getItem('prodven_cli_token')) {
        return 'Debes iniciar sesión como cliente para chatear con esta tienda.';
    }

    const mensajeBackend = error?.response?.data?.message;
    if (mensajeBackend && typeof mensajeBackend === 'string') {
        return mensajeBackend;
    }

        if (error?.response?.status) {
            const status = error.response.status;
            if (status === 401 || status === 403) {
                return 'Debes iniciar sesión para chatear con esta tienda.';
            }
            if (status === 404) {
                return 'Esta tienda no está disponible en este momento.';
            }
            if (status >= 500) {
                return 'Estamos teniendo problemas para conectar el chat. Intenta más tarde.';
            }
            return 'No se pudo iniciar el chat. Intenta nuevamente.';
        }

        if (error?.request) {
            return 'No hay conexión con el servidor. Revisa tu internet e intenta de nuevo.';
        }

        return 'No se pudo establecer la conexión con el chat.';
    };

    const ocultarToast = () => {
        setToast((actual) => (actual ? { ...actual, saliendo: true } : actual));
        timeoutRemoverRef.current = setTimeout(() => {
            if (montadoRef.current) setToast(null);
        }, DURACION_ANIMACION_SALIDA_MS);
    };

    const mostrarError = (mensaje) => {
        if (timeoutOcultarRef.current) clearTimeout(timeoutOcultarRef.current);
        if (timeoutRemoverRef.current) clearTimeout(timeoutRemoverRef.current);

        setToast({ mensaje, saliendo: false });

        timeoutOcultarRef.current = setTimeout(() => {
            ocultarToast();
        }, DURACION_TOAST_MS);
    };

    const handleIniciarChat = async () => {
        try {
            setCargando(true);

            const respuesta = await mensajeriaService.listarConversaciones(idEmpresa);
            // Confirmado: sendResponse siempre usa la clave data, no datos.
            const datos = respuesta?.data;
            const conversaciones = Array.isArray(datos?.conversaciones) ? datos.conversaciones : [];

            const chatExistente = conversaciones.find(
                (c) => c.idEmpresa === idEmpresa && c.tipo === 'cliente' && c.activo === true
            );

            if (chatExistente) {
                navigate(`/mis-compras/chat/${idEmpresa}/${chatExistente.idConversacion}`);
                return;
            }

            const nuevoChat = await mensajeriaService.crearConversacion({
                idEmpresa,
                tipo: 'cliente',
                asunto: `Consulta en tienda: ${nombreEmpresa || 'General'}`,
                participantes: []
            });

            // Confirmado: data = resultado.conversacion (según el controlador).
            const idConversacionNueva = nuevoChat?.data?.idConversacion;

            if (nuevoChat?.success && idConversacionNueva) {
                navigate(`/mis-compras/chat/${idEmpresa}/${idConversacionNueva}`);
            } else {
                throw new Error('RESPUESTA_INVALIDA');
            }
        } catch (error) {
            mostrarError(traducirError(error));
        } finally {
            if (montadoRef.current) setCargando(false);
        }
    };

    if (!idEmpresa) return null;

    return (
        <div className="btn-chat-contenedor">
            {toast && (
                <div
                    className={`btn-chat-toast ${toast.saliendo ? 'btn-chat-toast--saliendo' : 'btn-chat-toast--entrando'}`}
                    role="alert"
                >
                    <svg className="btn-chat-toast-icono" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3.75m0 3.75h.007M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{toast.mensaje}</span>
                    <button
                        type="button"
                        className="btn-chat-toast-cerrar"
                        onClick={ocultarToast}
                        aria-label="Cerrar aviso"
                    >
                        ×
                    </button>
                </div>
            )}

            <button
                onClick={handleIniciarChat}
                disabled={cargando}
                className="btn-chat-interactivo"
                title={`Chatear con ${nombreEmpresa || 'la tienda'}`}
                aria-label={`Chatear con ${nombreEmpresa || 'la tienda'}`}
                aria-busy={cargando}
            >
                {cargando ? (
                    <svg className="btn-chat-spinner" fill="none" viewBox="0 0 24 24">
                        <circle className="btn-chat-spinner-bg" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="btn-chat-spinner-front" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                ) : (
                    <svg className="btn-chat-icono" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                )}
            </button>
        </div>
    );
};

export default BotonChatCliente;