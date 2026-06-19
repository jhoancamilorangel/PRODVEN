import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import './ToastContext.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const quitar = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const mostrar = useCallback((tipo, mensaje) => {
        const id = Date.now() + Math.random();
        setToasts((prev) => [...prev, { id, tipo, mensaje }]);
        setTimeout(() => quitar(id), 4000);
    }, [quitar]);

    const toast = {
        exito: (msg) => mostrar('exito', msg),
        error: (msg) => mostrar('error', msg),
        info: (msg) => mostrar('info', msg)
    };

    const iconos = { exito: CheckCircle, error: XCircle, info: Info };

    return (
        <ToastContext.Provider value={toast}>
            {children}
            <div className="toast-contenedor">
                {toasts.map((t) => {
                    const Icono = iconos[t.tipo];
                    return (
                        <div className={`toast toast-${t.tipo}`} key={t.id}>
                            <Icono size={20} className="toast-icono" />
                            <span className="toast-mensaje">{t.mensaje}</span>
                            <button className="toast-cerrar" onClick={() => quitar(t.id)}>
                                <X size={16} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
    return ctx;
}