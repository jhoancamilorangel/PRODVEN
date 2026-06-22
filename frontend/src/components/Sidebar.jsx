import { NavLink } from 'react-router-dom';
import {
    LayoutDashboard, Package, Warehouse, ShoppingCart, Factory,
    MapPin, CreditCard, Sparkles, BarChart3, ShieldCheck, Settings, Tags, Store
} from 'lucide-react';
import './Sidebar.css';

/**
 * Menú lateral de navegación del panel administrativo.
 * Agrupa las secciones del sistema y resalta la ruta activa.
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

function Sidebar({ abierto }) {
    return (
        <aside className={`sidebar ${abierto ? 'sidebar-abierto' : ''}`}>
            <div className="sidebar-logo">
                <span className="sidebar-logo-texto">ProdVen</span>
            </div>

            <nav className="sidebar-nav">
                {SECCIONES.map((seccion) => (
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