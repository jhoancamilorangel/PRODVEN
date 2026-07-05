import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import solicitudNegocioService from '../services/solicitudNegocioService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    Store, ArrowLeft, ArrowRight, AlertTriangle, ShieldCheck,
    Boxes, Globe, TrendingUp, Check, Loader2, Building2,
    Phone, MapPin, Tag, FileText, PartyPopper
} from 'lucide-react';
import './SolicitarNegocio.css';

function SolicitarNegocio() {
    const navigate = useNavigate();
    const toast = useToast();

    // fase: 'advertencia' | 'formulario' | 'exito'
    const [fase, setFase] = useState('advertencia');
    const [enviando, setEnviando] = useState(false);

    const [form, setForm] = useState({
        nombreNegocio: '',
        categoria: '',
        telefono: '',
        ciudad: '',
        departamento: '',
        descripcion: ''
    });

    const estaLogueado = () => !!localStorage.getItem('prodven_cli_token');

    // Solo accesible con sesión de cliente
    useEffect(() => {
        if (!estaLogueado()) {
            toast.info('Inicia sesión para solicitar tu cuenta de negocio.');
            setTimeout(() => navigate('/cuenta'), 600);
        }
    }, []);

    const setCampo = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

    const enviarSolicitud = async () => {
        if (!form.nombreNegocio.trim() || form.nombreNegocio.trim().length < 2) {
            toast.error('Escribe el nombre de tu negocio.');
            return;
        }
        setEnviando(true);
        try {
            await solicitudNegocioService.crear({
                nombreNegocio: form.nombreNegocio.trim(),
                categoria: form.categoria.trim() || null,
                telefono: form.telefono.trim() || null,
                ciudad: form.ciudad.trim() || null,
                departamento: form.departamento.trim() || null,
                descripcion: form.descripcion.trim() || null
            });
            setFase('exito');
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudo enviar la solicitud.');
            setEnviando(false);
        }
    };

    return (
        <div className="sol">
            <MarketplaceHeader />

            <main className="sol-main">
                <button className="sol-volver" onClick={() => navigate('/marketplace')}>
                    <ArrowLeft size={18} /> Volver al marketplace
                </button>

                {/* ===== FASE 1: ADVERTENCIA ===== */}
                {fase === 'advertencia' && (
                    <div className="sol-advertencia">
                        <div className="sol-hero">
                            <div className="sol-hero-icono"><Store size={38} /></div>
                            <h1>Vende y gestiona tu negocio en ProdVen</h1>
                            <p className="sol-hero-sub">
                                Lleva el control interno de tu inventario y, si quieres,
                                vende al público en nuestro marketplace.
                            </p>
                        </div>

                        <div className="sol-beneficios">
                            <div className="sol-beneficio" style={{ '--i': 0 }}>
                                <div className="sol-beneficio-icono sol-ico-azul"><Boxes size={22} /></div>
                                <h3>Inventario interno</h3>
                                <p>Controla stock, productos y bodegas de tu negocio, aunque no vendas al público.</p>
                            </div>
                            <div className="sol-beneficio" style={{ '--i': 1 }}>
                                <div className="sol-beneficio-icono sol-ico-verde"><Globe size={22} /></div>
                                <h3>Marketplace público</h3>
                                <p>Cuando estés listo, activa tu tienda y llega a miles de clientes.</p>
                            </div>
                            <div className="sol-beneficio" style={{ '--i': 2 }}>
                                <div className="sol-beneficio-icono sol-ico-morado"><TrendingUp size={22} /></div>
                                <h3>Gestión completa</h3>
                                <p>Pedidos, pagos, reportes, producción y más, en un solo panel.</p>
                            </div>
                        </div>

                        <div className="sol-aviso">
                            <div className="sol-aviso-icono"><AlertTriangle size={24} /></div>
                            <div className="sol-aviso-texto">
                                <h4>Antes de continuar, ten esto en cuenta</h4>
                                <p>
                                    Al convertirte en negocio, <strong>esta cuenta dejará de funcionar
                                    como cuenta de cliente</strong>. Ya no podrás comprar en el marketplace
                                    con este correo. Si quieres seguir comprando, deberás crear una
                                    cuenta nueva con otro correo.
                                </p>
                                <p className="sol-aviso-nota">
                                    <ShieldCheck size={15} /> Tu solicitud será revisada por el equipo de ProdVen antes de activarse.
                                </p>
                            </div>
                        </div>

                        <div className="sol-acciones">
                            <button className="sol-btn-cancelar" onClick={() => navigate('/marketplace')}>
                                Cancelar
                            </button>
                            <button className="sol-btn-continuar" onClick={() => setFase('formulario')}>
                                Entiendo, quiero continuar <ArrowRight size={18} />
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== FASE 2: FORMULARIO ===== */}
                {fase === 'formulario' && (
                    <div className="sol-formulario">
                        <div className="sol-form-cabecera">
                            <div className="sol-form-cabecera-icono"><Building2 size={26} /></div>
                            <div>
                                <h2>Cuéntanos de tu negocio</h2>
                                <p>Con estos datos crearemos tu empresa en ProdVen.</p>
                            </div>
                        </div>

                        <div className="sol-form-campos">
                            <div className="sol-campo sol-campo-full">
                                <label><Building2 size={14} /> Nombre del negocio *</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Pizzería La Napolitana"
                                    value={form.nombreNegocio}
                                    onChange={(e) => setCampo('nombreNegocio', e.target.value)}
                                    maxLength={150}
                                />
                            </div>

                            <div className="sol-campo">
                                <label><Tag size={14} /> Categoría</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Restaurante, Moda, Tecnología"
                                    value={form.categoria}
                                    onChange={(e) => setCampo('categoria', e.target.value)}
                                    maxLength={100}
                                />
                            </div>

                            <div className="sol-campo">
                                <label><Phone size={14} /> Teléfono de contacto</label>
                                <input
                                    type="tel"
                                    placeholder="Ej: 300 123 4567"
                                    value={form.telefono}
                                    onChange={(e) => setCampo('telefono', e.target.value)}
                                    maxLength={20}
                                />
                            </div>

                            <div className="sol-campo">
                                <label><MapPin size={14} /> Ciudad</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Bogotá"
                                    value={form.ciudad}
                                    onChange={(e) => setCampo('ciudad', e.target.value)}
                                    maxLength={100}
                                />
                            </div>

                            <div className="sol-campo">
                                <label><MapPin size={14} /> Departamento</label>
                                <input
                                    type="text"
                                    placeholder="Ej: Cundinamarca"
                                    value={form.departamento}
                                    onChange={(e) => setCampo('departamento', e.target.value)}
                                    maxLength={100}
                                />
                            </div>

                            <div className="sol-campo sol-campo-full">
                                <label><FileText size={14} /> Descripción (opcional)</label>
                                <textarea
                                    placeholder="Cuéntanos brevemente a qué se dedica tu negocio..."
                                    value={form.descripcion}
                                    onChange={(e) => setCampo('descripcion', e.target.value)}
                                    rows={4}
                                    maxLength={500}
                                />
                                <span className="sol-contador">{form.descripcion.length}/500</span>
                            </div>
                        </div>

                        <div className="sol-acciones">
                            <button
                                className="sol-btn-cancelar"
                                onClick={() => setFase('advertencia')}
                                disabled={enviando}
                            >
                                <ArrowLeft size={17} /> Atrás
                            </button>
                            <button
                                className="sol-btn-continuar"
                                onClick={enviarSolicitud}
                                disabled={enviando}
                            >
                                {enviando
                                    ? (<><Loader2 size={18} className="sol-girando" /> Enviando...</>)
                                    : (<>Enviar solicitud <Check size={18} /></>)}
                            </button>
                        </div>
                    </div>
                )}

                {/* ===== FASE 3: ÉXITO ===== */}
                {fase === 'exito' && (
                    <div className="sol-exito">
                        <div className="sol-exito-icono">
                            <PartyPopper size={44} />
                        </div>
                        <h2>¡Solicitud enviada!</h2>
                        <p>
                            Recibimos tu solicitud para <strong>{form.nombreNegocio}</strong>.
                            El equipo de ProdVen la revisará y te avisaremos cuando sea aprobada.
                        </p>
                        <div className="sol-exito-pasos">
                            <div className="sol-exito-paso">
                                <span className="sol-exito-num">1</span>
                                <span>Revisamos tu solicitud</span>
                            </div>
                            <div className="sol-exito-linea"></div>
                            <div className="sol-exito-paso">
                                <span className="sol-exito-num">2</span>
                                <span>Te notificamos la aprobación</span>
                            </div>
                            <div className="sol-exito-linea"></div>
                            <div className="sol-exito-paso">
                                <span className="sol-exito-num">3</span>
                                <span>Inicias sesión en tu panel</span>
                            </div>
                        </div>
                        <button className="sol-btn-continuar" onClick={() => navigate('/marketplace')}>
                            Volver al marketplace <ArrowRight size={18} />
                        </button>
                    </div>
                )}
            </main>

            <MarketplaceFooter />
        </div>
    );
}

export default SolicitarNegocio;