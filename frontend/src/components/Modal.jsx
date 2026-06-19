import { X } from 'lucide-react';
import './Modal.css';

/**
 * Ventana modal reutilizable.
 * Se usa para formularios de crear/editar y confirmaciones.
 */
function Modal({ abierto, onCerrar, titulo, children, ancho = '520px' }) {
    if (!abierto) return null;

    return (
        <div className="modal-overlay" onClick={onCerrar}>
            <div
                className="modal-ventana"
                style={{ maxWidth: ancho }}
                onClick={(e) => e.stopPropagation()}
            >
                <header className="modal-cabecera">
                    <h2>{titulo}</h2>
                    <button className="modal-cerrar" onClick={onCerrar} aria-label="Cerrar">
                        <X size={20} />
                    </button>
                </header>
                <div className="modal-cuerpo">
                    {children}
                </div>
            </div>
        </div>
    );
}

export default Modal;