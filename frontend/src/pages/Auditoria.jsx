import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import auditoriaService from '../services/auditoriaService';
import {
    ShieldCheck, Plus, Pencil, Trash2, LogIn, LogOut, Eye,
    Package, ShoppingCart, CreditCard, User, Settings, FileText,
    Filter, Clock, Activity
} from 'lucide-react';
import './Auditoria.css';

const ACCIONES = {
    crear:       { etiqueta: 'Creación', color: '#27AE60', icono: Plus },
    crear_orden: { etiqueta: 'Creación', color: '#27AE60', icono: Plus },
    actualizar:  { etiqueta: 'Actualización', color: '#2980b9', icono: Pencil },
    editar:      { etiqueta: 'Edición', color: '#2980b9', icono: Pencil },
    eliminar:    { etiqueta: 'Eliminación', color: '#e74c3c', icono: Trash2 },
    desactivar:  { etiqueta: 'Desactivación', color: '#e67e22', icono: Trash2 },
    login:       { etiqueta: 'Inicio de sesión', color: '#8e44ad', icono: LogIn },
    logout:      { etiqueta: 'Cierre de sesión', color: '#7f8c8d', icono: LogOut },
    ver:         { etiqueta: 'Consulta', color: '#16a085', icono: Eye }
};

const ENTIDADES = {
    producto:   { icono: Package, color: '#9b59b6' },
    pedido:     { icono: ShoppingCart, color: '#2980b9' },
    pago:       { icono: CreditCard, color: '#27AE60' },
    usuario:    { icono: User, color: '#e67e22' },
    configuracion: { icono: Settings, color: '#7f8c8d' },
    categoria:  { icono: FileText, color: '#16a085' }
};

const FILTROS_ACCION = ['todos', 'crear', 'actualizar', 'eliminar', 'login'];

function Auditoria() {
    const { usuario } = useAuth();
    const toast = useToast();
    const idEmpresa = usuario?.idEmpresa;

    const [registros, setRegistros] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [filtroAccion, setFiltroAccion] = useState('todos');

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const params = filtroAccion !== 'todos' ? { accion: filtroAccion } : {};
            const res = await auditoriaService.listar(idEmpresa, params);
            const datos = res.data.data?.registros || res.data.data?.auditoria || res.data.data || [];
            setRegistros(Array.isArray(datos) ? datos : []);
        } catch {
            toast.error('No se pudieron cargar los registros de auditoría.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa, filtroAccion]);

    useEffect(() => { cargar(); }, [cargar]);

    const formatoFechaHora = (f) => {
        if (!f) return '';
        return new Date(f).toLocaleDateString('es-CO', {
            day: '2-digit', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const normalizarAccion = (accion) => {
        if (!accion) return 'ver';
        const a = accion.toLowerCase();
        if (a.includes('crear') || a.includes('crea')) return 'crear';
        if (a.includes('actualiz') || a.includes('edit')) return 'actualizar';
        if (a.includes('elimin') || a.includes('borr')) return 'eliminar';
        if (a.includes('desactiv')) return 'desactivar';
        if (a.includes('login') || a.includes('sesión') || a.includes('sesion')) return 'login';
        if (a.includes('logout')) return 'logout';
        return a;
    };

    return (
        <div className="audit">
            <div className="audit-cabecera">
                <div className="audit-cabecera-titulo">
                    <div className="audit-cabecera-icono">
                        <ShieldCheck size={26} />
                    </div>
                    <div>
                        <h1>Auditoría</h1>
                        <p>Trazabilidad de todas las acciones en tu sistema</p>
                    </div>
                </div>
            </div>

            {/* Filtros */}
            <div className="audit-filtros">
                <Filter size={16} />
                {FILTROS_ACCION.map((f) => (
                    <button
                        key={f}
                        className={`audit-filtro ${filtroAccion === f ? 'audit-filtro-activo' : ''}`}
                        onClick={() => setFiltroAccion(f)}
                    >
                        {f === 'todos' ? 'Todas' : ACCIONES[f]?.etiqueta || f}
                    </button>
                ))}
            </div>

            {cargando ? (
                <div className="audit-cargando"><div className="audit-spinner"></div><p>Cargando registros...</p></div>
            ) : registros.length === 0 ? (
                <div className="audit-vacio">
                    <Activity size={56} strokeWidth={1.3} />
                    <h3>Sin registros de auditoría</h3>
                    <p>Aquí aparecerá el historial de acciones a medida que uses el sistema.</p>
                </div>
            ) : (
                <div className="audit-timeline">
                    {registros.map((r, i) => {
                        const accionKey = normalizarAccion(r.accion);
                        const acc = ACCIONES[accionKey] || ACCIONES.ver;
                        const AccIcono = acc.icono;
                        const ent = ENTIDADES[r.entidad] || {};
                        const EntIcono = ent.icono;
                        return (
                            <div className="audit-item" key={r.idAuditoria || r.idRegistro || i}>
                                <div className="audit-item-linea">
                                    <div className="audit-item-punto" style={{ background: acc.color, boxShadow: `0 0 0 4px ${acc.color}22` }}>
                                        <AccIcono size={15} />
                                    </div>
                                    {i < registros.length - 1 && <div className="audit-item-conector"></div>}
                                </div>
                                <div className="audit-item-tarjeta">
                                    <div className="audit-item-cabecera">
                                        <span className="audit-item-accion" style={{ color: acc.color, background: `${acc.color}14` }}>
                                            {acc.etiqueta}
                                        </span>
                                        {r.entidad && (
                                            <span className="audit-item-entidad">
                                                {EntIcono && <EntIcono size={14} style={{ color: ent.color }} />}
                                                {r.entidad}
                                            </span>
                                        )}
                                        <span className="audit-item-fecha">
                                            <Clock size={13} /> {formatoFechaHora(r.fechaCreacion || r.fecha)}
                                        </span>
                                    </div>
                                    <p className="audit-item-descripcion">
                                        {r.descripcion || r.detalle || `Acción "${r.accion}" sobre ${r.entidad || 'el sistema'}`}
                                    </p>
                                    <div className="audit-item-pie">
                                        <span className="audit-item-usuario">
                                            <User size={13} /> {r.nombreUsuario || r.realizadoPor || r.usuario || 'Sistema'}
                                        </span>
                                        {r.ip && <span className="audit-item-ip">IP: {r.ip}</span>}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default Auditoria;