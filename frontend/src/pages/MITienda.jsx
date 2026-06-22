import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import empresaService from '../services/empresaService';
import {
    Store, Globe, Lock, Check, ExternalLink, Copy,
    Eye, ShoppingBag, Sparkles, AlertCircle
} from 'lucide-react';
import './MiTienda.css';

function MiTienda() {
    const toast = useToast();

    const [empresa, setEmpresa] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [cambiando, setCambiando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            const res = await empresaService.obtenerMiEmpresa();
            setEmpresa(res.data.data?.empresa || res.data.data || null);
        } catch {
            toast.error('No se pudo cargar la información de tu tienda.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const esPublica = empresa?.modoPublico === true || empresa?.modoPublico === 1;

    const toggleMarketplace = async () => {
        setCambiando(true);
        try {
            const nuevoEstado = !esPublica;
            await empresaService.toggleMarketplace(nuevoEstado);
            setEmpresa((p) => ({ ...p, modoPublico: nuevoEstado }));
            toast.exito(nuevoEstado
                ? '¡Tu tienda ya es pública! Tus clientes pueden comprarte en línea.'
                : 'Tu tienda volvió a modo privado.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cambiar el estado de la tienda.');
        } finally {
            setCambiando(false);
        }
    };

    const urlTienda = empresa ? `${window.location.origin}/tienda/${empresa.idEmpresa}` : '';

    const copiarUrl = () => {
        navigator.clipboard.writeText(urlTienda);
        toast.exito('Enlace copiado al portapapeles.');
    };

    if (cargando) {
        return (
            <div className="tienda">
                <div className="tienda-cargando"><div className="tienda-spinner"></div><p>Cargando tu tienda...</p></div>
            </div>
        );
    }

    return (
        <div className="tienda">
            <div className="tienda-cabecera">
                <div className="tienda-cabecera-titulo">
                    <div className="tienda-cabecera-icono"><Store size={26} /></div>
                    <div>
                        <h1>Mi Tienda</h1>
                        <p>Controla la presencia pública de tu negocio en el marketplace</p>
                    </div>
                </div>
            </div>

            {/* TARJETA PRINCIPAL DE ESTADO */}
            <div className={`tienda-estado ${esPublica ? 'tienda-estado-publica' : 'tienda-estado-privada'}`}>
                <div className="tienda-estado-fondo"></div>
                <div className="tienda-estado-contenido">
                    <div className="tienda-estado-icono">
                        {esPublica ? <Globe size={40} /> : <Lock size={40} />}
                    </div>
                    <div className="tienda-estado-texto">
                        <span className="tienda-estado-badge">
                            {esPublica ? 'Tienda pública' : 'Tienda privada'}
                        </span>
                        <h2>{esPublica ? 'Tu tienda está abierta al público' : 'Tu tienda está en modo privado'}</h2>
                        <p>
                            {esPublica
                                ? 'Tus clientes pueden encontrarte en el marketplace, navegar tu catálogo y realizar pedidos en línea.'
                                : 'Solo tú y tu equipo pueden ver tu negocio. Actívala para que tus clientes puedan comprarte en línea.'}
                        </p>
                    </div>
                    <button
                        className={`tienda-toggle-btn ${esPublica ? 'tienda-toggle-desactivar' : 'tienda-toggle-activar'}`}
                        onClick={toggleMarketplace}
                        disabled={cambiando}
                    >
                        {cambiando ? 'Cambiando...' : esPublica ? 'Desactivar tienda' : 'Activar mi tienda'}
                    </button>
                </div>
            </div>

            {/* ENLACE DE LA TIENDA (solo si es pública) */}
            {esPublica && (
                <div className="tienda-enlace">
                    <div className="tienda-enlace-info">
                        <ExternalLink size={20} />
                        <div>
                            <span className="tienda-enlace-label">Enlace de tu tienda</span>
                            <span className="tienda-enlace-url">{urlTienda}</span>
                        </div>
                    </div>
                    <div className="tienda-enlace-acciones">
                        <button className="tienda-btn-copiar" onClick={copiarUrl}>
                            <Copy size={16} /> Copiar
                        </button>
                        <a className="tienda-btn-visitar" href={urlTienda} target="_blank" rel="noopener noreferrer">
                            <Eye size={16} /> Visitar
                        </a>
                    </div>
                </div>
            )}

            {/* PASOS / CHECKLIST */}
            <div className="tienda-info">
                <h3><Sparkles size={18} /> {esPublica ? 'Tu tienda está lista' : 'Antes de activar, asegúrate de tener'}</h3>
                <div className="tienda-checklist">
                    <div className="tienda-check-item">
                        <div className="tienda-check-icono"><ShoppingBag size={18} /></div>
                        <div>
                            <span className="tienda-check-titulo">Productos publicados</span>
                            <span className="tienda-check-desc">Tu catálogo debe tener productos visibles para los clientes.</span>
                        </div>
                    </div>
                    <div className="tienda-check-item">
                        <div className="tienda-check-icono"><Sparkles size={18} /></div>
                        <div>
                            <span className="tienda-check-titulo">Colores de marca configurados</span>
                            <span className="tienda-check-desc">Personaliza la apariencia en Configuración → Apariencia.</span>
                        </div>
                    </div>
                    <div className="tienda-check-item">
                        <div className="tienda-check-icono"><Check size={18} /></div>
                        <div>
                            <span className="tienda-check-titulo">Métodos de pago activos</span>
                            <span className="tienda-check-desc">Define cómo te pueden pagar en Configuración → Pagos.</span>
                        </div>
                    </div>
                </div>
            </div>

            {!esPublica && (
                <div className="tienda-nota">
                    <AlertCircle size={18} />
                    <span>Mientras tu tienda esté en modo privado, los clientes no podrán verla ni hacer pedidos. Puedes activarla y desactivarla cuando quieras.</span>
                </div>
            )}
        </div>
    );
}

export default MiTienda;