import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Package, Warehouse, ShoppingCart, Factory,
    MapPin, CreditCard, Sparkles, BarChart3, ShieldCheck, Settings, Tags, Store, Boxes, Inbox, Building2
} from 'lucide-react';
import './Sidebar.css';

/**
 * Menú lateral de navegación del panel administrativo.
 * Agrupa las secciones del sistema y resalta la ruta activa.
 * El grupo "Plataforma" (Solicitudes, Empresas) solo se muestra al superadmin.
 */
const SECCIONES = [
    {
        grupo: 'Principal',
        items: [
            { ruta: '/dashboard', etiqueta: 'Dashboard', icono: LayoutDashboard }
        ]
    },
    {
        grupo: 'Catálogo e inventario',
        items: [
            { ruta: '/productos', etiqueta: 'Productos', icono: Package },
            { ruta: '/categorias', etiqueta: 'Categorias', icono: Tags },
            { ruta: '/inventario', etiqueta: 'Inventario', icono: Warehouse }
        ]
    },
    {
        grupo: 'Control de Inventario',
        items: [
            { ruta: '/control-inventario', etiqueta: 'Control de Inventario', icono: Boxes }
        ]
    },
    {
        grupo: 'Operación',
        items: [
            { ruta: '/pedidos', etiqueta: 'Pedidos', icono: ShoppingCart },
            { ruta: '/produccion', etiqueta: 'Producción', icono: Factory },
            { ruta: '/logistica', etiqueta: 'Logística', icono: MapPin }
        ]
    },
    {
        grupo: 'Comercial',
        items: [
            { ruta: '/pagos', etiqueta: 'Pagos', icono: CreditCard },
            { ruta: '/engagement', etiqueta: 'Engagement', icono: Sparkles }
        ]
    },
    {
        grupo: 'Marketplace',
        items: [
            { ruta: '/mi-tienda', etiqueta: 'Mi Tienda', icono: Store }
        ]
    },
    {
        grupo: 'Análisis y ajustes',
        items: [
            { ruta: '/reportes', etiqueta: 'Reportes', icono: BarChart3 },
            { ruta: '/auditoria', etiqueta: 'Auditoría', icono: ShieldCheck },
            { ruta: '/configuracion', etiqueta: 'Configuración', icono: Settings }
        ]
    }
];

// Secciones visibles solo para el superadmin (administración de la plataforma)
const SECCIONES_SUPERADMIN = [
    {
        grupo: 'Plataforma',
        items: [
            { ruta: '/solicitudes', etiqueta: 'Solicitudes', icono: Inbox },
            { ruta: '/empresas', etiqueta: 'Empresas', icono: Building2 }
        ]
    }
];

function Sidebar({ abierto }) {
    const { usuario } = useAuth();
    const esSuperAdmin = usuario?.rol === 'superadmin';

    // Al superadmin le sumamos las secciones de plataforma
    const secciones = esSuperAdmin
        ? [...SECCIONES, ...SECCIONES_SUPERADMIN]
        : SECCIONES;

    return (
        <aside className={`sidebar ${abierto ? 'sidebar-abierto' : ''}`}>
            <div className="sidebar-logo">
                <span className="sidebar-logo-texto">ProdVen</span>
            </div>

            <nav className="sidebar-nav">
                {secciones.map((seccion) => (
                    <div className="sidebar-grupo" key={seccion.grupo}>
                        <p className="sidebar-grupo-titulo">{seccion.grupo}</p>
                        {seccion.items.map((item) => {
                            const Icono = item.icono;
                            return (
                                <NavLink
                                    key={item.ruta}
                                    to={item.ruta}
                                    className={({ isActive }) =>
                                        `sidebar-item ${isActive ? 'sidebar-item-activo' : ''}`
                                    }
                                >
                                    <Icono size={19} strokeWidth={2} className="sidebar-item-icono" />
                                    <span className="sidebar-item-texto">{item.etiqueta}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </aside>
    );
}

export default Sidebar;