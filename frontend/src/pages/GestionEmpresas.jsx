import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import empresaAdminService from '../services/empresaAdminService';
import {
    Building2, Search, Gift, Crown, Store, Ban, CheckCircle2,
    PauseCircle, PlayCircle, Loader2, Inbox, TrendingUp, Users,
    Globe, X, ShieldCheck, AlertTriangle, ArrowUpDown, Sparkles
} from 'lucide-react';
import './GestionEmpresas.css';

const FILTROS_ESTADO = [
    { valor: '', etiqueta: 'Todas' },
    { valor: 'activa', etiqueta: 'Activas' },
    { valor: 'pendiente_verificacion', etiqueta: 'Pendientes' },
    { valor: 'suspendida', etiqueta: 'Suspendidas' },
    { valor: 'inactiva', etiqueta: 'Inactivas' }
];

const PLANES = ['free', 'basico', 'premium', 'enterprise'];

const NOMBRE_PLAN = {
    free: 'Free',
    basico: 'Básico',
    premium: 'Premium',
    enterprise: 'Enterprise'
};

function GestionEmpresas() {
    const toast = useToast();

    const [empresas, setEmpresas] = useState([]);
    const [estadisticas, setEstadisticas] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');
    const [filtroEstado, setFiltroEstado] = useState('');
    const [procesando, setProcesando] = useState(null);

    // Modales: { tipo: 'cortesia'|'quitar-cortesia'|'suspender'|'plan'|'desactivar'|'activar', empresa }
    const [modal, setModal] = useState(null);
    const [motivo, setMotivo] = useState('');
    const [planElegido, setPlanElegido] = useState('premium');

    const cargar = useCallback(async () => {
        setCargando(true);
        try {
            const params = { limit: 100 };
            if (filtroEstado) params.estado = filtroEstado;
            if (busqueda.trim()) params.busqueda = busqueda.trim();

            const [resEmp, resStats] = await Promise.all([
                empresaAdminService.listar(params),
                empresaAdminService.obtenerEstadisticas().catch(() => null)
            ]);

            setEmpresas(resEmp.data?.data?.empresas || []);
            if (resStats) setEstadisticas(resStats.data?.data || null);
        } catch {
            setEmpresas([]);
            toast.error('No se pudieron cargar las empresas.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filtroEstado, busqueda]);

    useEffect(() => { cargar(); }, [cargar]);

    const cerrarModal = () => {
        setModal(null);
        setMotivo('');
        setPlanElegido('premium');
    };

    const ejecutarAccion = async () => {
        if (!modal) return;
        const { tipo, empresa } = modal;
        const idEmpresa = empresa.idEmpresa;
        const idSuscripcion = empresa.suscripcion?.idSuscripcion;

        // Validaciones previas
        if (tipo === 'suspender' && motivo.trim().length < 10) {
            toast.error('El motivo debe tener al menos 10 caracteres.');
            return;
        }

        setProcesando(idEmpresa);
        cerrarModal();

        try {
            let mensaje = '';
            switch (tipo) {
                case 'cortesia':
                    await empresaAdminService.activarCortesia(idEmpresa);
                    mensaje = `${empresa.nombre} ahora tiene acceso de cortesía (gratis).`;
                    break;
                case 'quitar-cortesia':
                    await empresaAdminService.quitarCortesia(idEmpresa);
                    mensaje = `Cortesía retirada. ${empresa.nombre} pasa a premium con 30 días de prueba.`;
                    break;
                case 'suspender':
                    await empresaAdminService.suspender(idEmpresa, motivo.trim());
                    mensaje = `${empresa.nombre} fue suspendida.`;
                    break;
                case 'desactivar':
                    await empresaAdminService.desactivar(idEmpresa);
                    mensaje = `${empresa.nombre} fue desactivada.`;
                    break;
                case 'activar':
                    await empresaAdminService.activar(idEmpresa);
                    mensaje = `${empresa.nombre} fue activada.`;
                    break;
                case 'plan':
                    if (!idSuscripcion) { toast.error('Esta empresa no tiene suscripción.'); break; }
                    await empresaAdminService.cambiarPlan(idSuscripcion, planElegido);
                    mensaje = `Plan de ${empresa.nombre} cambiado a ${NOMBRE_PLAN[planElegido]}.`;
                    break;
                default:
                    break;
            }
            if (mensaje) toast.exito(mensaje);
            cargar();
        } catch (error) {
            toast.error(error?.response?.data?.message || 'No se pudo completar la acción.');
        } finally {
            setProcesando(null);
        }
    };

    const abrirModal = (tipo, empresa) => {
        setPlanElegido(empresa.suscripcion?.plan || 'premium');
        setModal({ tipo, empresa });
    };

    const iniciales = (nombre) => (nombre || 'E').substring(0, 2).toUpperCase();

    return (
        <div className="ge">
            {/* Cabecera */}
            <div className="ge-cabecera">
                <div className="ge-cabecera-titulo">
                    <div className="ge-cabecera-icono"><Building2 size={24} /></div>
                    <div>
                        <h1>Gestión de empresas</h1>
                        <p>Administra todas las empresas, sus planes y accesos de cortesía.</p>
                    </div>
                </div>
            </div>

            {/* Estadísticas */}
            {estadisticas && (
                <div className="ge-stats">
                    <div className="ge-stat">
                        <div className="ge-stat-icono ge-stat-azul"><Building2 size={20} /></div>
                        <div>
                            <span className="ge-stat-num">{estadisticas.totalEmpresas}</span>
                            <span className="ge-stat-label">Empresas totales</span>
                        </div>
                    </div>
                    <div className="ge-stat">
                        <div className="ge-stat-icono ge-stat-verde"><Globe size={20} /></div>
                        <div>
                            <span className="ge-stat-num">{estadisticas.empresasPublicas}</span>
                            <span className="ge-stat-label">En marketplace</span>
                        </div>
                    </div>
                    <div className="ge-stat">
                        <div className="ge-stat-icono ge-stat-morado"><CheckCircle2 size={20} /></div>
                        <div>
                            <span className="ge-stat-num">{estadisticas.empresasVerificadas}</span>
                            <span className="ge-stat-label">Activas</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Controles */}
            <div className="ge-controles">
                <div className="ge-buscador">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, correo o NIT..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
                <div className="ge-filtros">
                    {FILTROS_ESTADO.map((f) => (
                        <button
                            key={f.valor || 'todas'}
                            className={`ge-filtro ${filtroEstado === f.valor ? 'ge-filtro-activo' : ''}`}
                            onClick={() => setFiltroEstado(f.valor)}
                        >
                            {f.etiqueta}
                        </button>
                    ))}
                </div>
            </div>

            {/* Lista */}
            {cargando ? (
                <div className="ge-cargando">
                    <Loader2 size={30} className="ge-girando" />
                    <p>Cargando empresas...</p>
                </div>
            ) : empresas.length === 0 ? (
                <div className="ge-vacio">
                    <div className="ge-vacio-icono"><Inbox size={34} /></div>
                    <h3>No hay empresas</h3>
                    <p>No se encontraron empresas con los filtros actuales.</p>
                </div>
            ) : (
                <div className="ge-lista">
                    {empresas.map((emp, idx) => {
                        const sus = emp.suscripcion;
                        const esCortesia = sus?.esCortesia;
                        const plan = sus?.plan || 'free';
                        return (
                            <div className="ge-card" key={emp.idEmpresa} style={{ '--i': idx }}>
                                <div className="ge-card-top">
                                    <div className="ge-empresa">
                                        <div className={`ge-empresa-avatar ${esCortesia ? 'ge-avatar-cortesia' : ''}`}>
                                            {esCortesia ? <Crown size={18} /> : iniciales(emp.nombre)}
                                        </div>
                                        <div className="ge-empresa-info">
                                            <h3>{emp.nombre}</h3>
                                            <span>{emp.correo}</span>
                                        </div>
                                    </div>
                                    {emp.modoPublico && (
                                        <span className="ge-badge-market" title="Publicada en el marketplace">
                                            <Globe size={12} /> Marketplace
                                        </span>
                                    )}
                                </div>

                                <div className="ge-card-badges">
                                    <span className={`ge-badge-plan ge-plan-${plan}`}>
                                        {esCortesia ? <><Gift size={12} /> Cortesía</> : <><Sparkles size={12} /> {NOMBRE_PLAN[plan]}</>}
                                    </span>
                                    <span className={`ge-badge-estado ge-estado-${emp.estado}`}>
                                        {emp.estado === 'activa' && 'Activa'}
                                        {emp.estado === 'pendiente_verificacion' && 'Pendiente'}
                                        {emp.estado === 'suspendida' && 'Suspendida'}
                                        {emp.estado === 'inactiva' && 'Inactiva'}
                                    </span>
                                    {emp.ciudad && <span className="ge-badge-ciudad">{emp.ciudad}</span>}
                                </div>

                                {/* Acciones */}
                                <div className="ge-card-acciones">
                                    {esCortesia ? (
                                        <button
                                            className="ge-accion ge-accion-quitar"
                                            onClick={() => abrirModal('quitar-cortesia', emp)}
                                            disabled={procesando === emp.idEmpresa}
                                        >
                                            <Ban size={15} /> Quitar cortesía
                                        </button>
                                    ) : (
                                        <button
                                            className="ge-accion ge-accion-cortesia"
                                            onClick={() => abrirModal('cortesia', emp)}
                                            disabled={procesando === emp.idEmpresa}
                                        >
                                            <Gift size={15} /> Dar cortesía
                                        </button>
                                    )}

                                    <button
                                        className="ge-accion ge-accion-plan"
                                        onClick={() => abrirModal('plan', emp)}
                                        disabled={procesando === emp.idEmpresa || esCortesia}
                                        title={esCortesia ? 'Quita la cortesía primero para cambiar el plan' : 'Cambiar plan'}
                                    >
                                        <ArrowUpDown size={15} /> Plan
                                    </button>

                                    {emp.estado === 'suspendida' || emp.estado === 'inactiva' ? (
                                        <button
                                            className="ge-accion ge-accion-activar"
                                            onClick={() => abrirModal('activar', emp)}
                                            disabled={procesando === emp.idEmpresa}
                                        >
                                            <PlayCircle size={15} /> Activar
                                        </button>
                                    ) : (
                                        <button
                                            className="ge-accion ge-accion-suspender"
                                            onClick={() => abrirModal('suspender', emp)}
                                            disabled={procesando === emp.idEmpresa}
                                        >
                                            <PauseCircle size={15} /> Suspender
                                        </button>
                                    )}
                                </div>

                                {procesando === emp.idEmpresa && (
                                    <div className="ge-card-procesando">
                                        <Loader2 size={16} className="ge-girando" /> Procesando...
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ===== MODAL ===== */}
            {modal && (
                <div className="ge-modal-fondo" onClick={cerrarModal}>
                    <div className="ge-modal" onClick={(e) => e.stopPropagation()}>
                        {/* Cortesía */}
                        {modal.tipo === 'cortesia' && (
                            <>
                                <div className="ge-modal-icono ge-modal-ico-verde"><Gift size={28} /></div>
                                <h3>Dar acceso de cortesía</h3>
                                <p>
                                    <strong>{modal.empresa.nombre}</strong> tendrá acceso completo y gratuito
                                    (todo desbloqueado, incluido marketplace) sin vencimiento, hasta que
                                    tú se lo retires.
                                </p>
                            </>
                        )}
                        {/* Quitar cortesía */}
                        {modal.tipo === 'quitar-cortesia' && (
                            <>
                                <div className="ge-modal-icono ge-modal-ico-naranja"><AlertTriangle size={28} /></div>
                                <h3>Quitar cortesía</h3>
                                <p>
                                    <strong>{modal.empresa.nombre}</strong> pasará a plan premium con 30 días
                                    de prueba. Al vencer, si no paga, caerá a free y perderá el marketplace.
                                </p>
                            </>
                        )}
                        {/* Suspender */}
                        {modal.tipo === 'suspender' && (
                            <>
                                <div className="ge-modal-icono ge-modal-ico-rojo"><PauseCircle size={28} /></div>
                                <h3>Suspender empresa</h3>
                                <p><strong>{modal.empresa.nombre}</strong> dejará de operar hasta que la reactives.</p>
                                <textarea
                                    className="ge-modal-textarea"
                                    placeholder="Motivo de la suspensión (mínimo 10 caracteres)..."
                                    value={motivo}
                                    onChange={(e) => setMotivo(e.target.value)}
                                    rows={3}
                                    maxLength={300}
                                    autoFocus
                                />
                            </>
                        )}
                        {/* Activar */}
                        {modal.tipo === 'activar' && (
                            <>
                                <div className="ge-modal-icono ge-modal-ico-verde"><PlayCircle size={28} /></div>
                                <h3>Activar empresa</h3>
                                <p><strong>{modal.empresa.nombre}</strong> volverá a estar operativa.</p>
                            </>
                        )}
                        {/* Cambiar plan */}
                        {modal.tipo === 'plan' && (
                            <>
                                <div className="ge-modal-icono ge-modal-ico-azul"><ArrowUpDown size={28} /></div>
                                <h3>Cambiar plan</h3>
                                <p>Selecciona el nuevo plan para <strong>{modal.empresa.nombre}</strong>.</p>
                                <div className="ge-plan-opciones">
                                    {PLANES.map((p) => (
                                        <button
                                            key={p}
                                            className={`ge-plan-opcion ${planElegido === p ? 'ge-plan-opcion-activa' : ''}`}
                                            onClick={() => setPlanElegido(p)}
                                        >
                                            {NOMBRE_PLAN[p]}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}

                        <div className="ge-modal-acciones">
                            <button className="ge-modal-cancelar" onClick={cerrarModal}>Cancelar</button>
                            <button className="ge-modal-confirmar" onClick={ejecutarAccion}>
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default GestionEmpresas;