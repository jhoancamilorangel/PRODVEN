import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import reporteService from '../services/reporteService';
import {
    DollarSign, Package, Clock, AlertCircle, TrendingUp,
    ShoppingBag, Trophy
} from 'lucide-react';
import './Dashboard.css';

/**
 * Dashboard principal del panel administrativo.
 * Muestra los indicadores clave del negocio con datos reales del backend.
 */
function Dashboard() {
    const { usuario } = useAuth();
    const [resumen, setResumen] = useState(null);
    const [productos, setProductos] = useState([]);
    const [porEstado, setPorEstado] = useState({});
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const cargarDatos = async () => {
            if (!usuario?.idEmpresa) return;
            try {
                setCargando(true);
                const [resResumen, resProductos, resEstados] = await Promise.all([
                    reporteService.resumenGeneral(usuario.idEmpresa),
                    reporteService.productosMasVendidos(usuario.idEmpresa, 5),
                    reporteService.pedidosPorEstado(usuario.idEmpresa)
                ]);
                setResumen(resResumen.data.data);
                setProductos(resProductos.data.data.productos || []);
                setPorEstado(resEstados.data.data.porEstado || {});
            } catch {
                setError('No se pudieron cargar los datos del dashboard.');
            } finally {
                setCargando(false);
            }
        };
        cargarDatos();
    }, [usuario]);

    const formatoMoneda = (valor) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
            .format(valor || 0);

    const estados = [
        { clave: 'pendiente', etiqueta: 'Pendientes', color: '#f39c12' },
        { clave: 'confirmado', etiqueta: 'Confirmados', color: '#3498db' },
        { clave: 'en_preparacion', etiqueta: 'En preparación', color: '#9b59b6' },
        { clave: 'en_camino', etiqueta: 'En camino', color: '#1abc9c' },
        { clave: 'entregado', etiqueta: 'Entregados', color: '#27AE60' },
        { clave: 'cancelado', etiqueta: 'Cancelados', color: '#e74c3c' },
        { clave: 'reembolsado', etiqueta: 'Reembolsados', color: '#95a5a6' }
    ];

    const tarjetas = [
        {
            icono: DollarSign, valor: formatoMoneda(resumen?.ventasConsumadas?.total),
            label: 'Ventas consumadas', clase: 'verde'
        },
        {
            icono: Package, valor: resumen?.ventasConsumadas?.pedidos || 0,
            label: 'Pedidos entregados', clase: 'azul'
        },
        {
            icono: Clock, valor: resumen?.ventasEnProceso?.pedidos || 0,
            label: 'Pedidos en proceso', clase: 'naranja'
        },
        {
            icono: AlertCircle, valor: resumen?.pedidosPendientes || 0,
            label: 'Pendientes de atender', clase: 'rojo'
        }
    ];

    if (cargando) {
        return (
            <div className="dash-cargando">
                <div className="dash-spinner"></div>
                <p>Cargando información del negocio...</p>
            </div>
        );
    }

    return (
        <div className="dashboard">
            <div className="dash-cabecera">
                <h1>Hola, {usuario?.nombres} 👋</h1>
                <p>Este es el resumen de tu negocio hoy</p>
            </div>

            {error && <div className="dash-error">{error}</div>}

            {/* Tarjetas de indicadores */}
            <div className="dash-tarjetas">
                {tarjetas.map((t, i) => {
                    const Icono = t.icono;
                    return (
                        <div className={`dash-tarjeta dash-tarjeta-${t.clase}`} key={i}>
                            <div className="dash-tarjeta-icono">
                                <Icono size={24} strokeWidth={2.5} />
                            </div>
                            <div className="dash-tarjeta-info">
                                <span className="dash-tarjeta-valor">{t.valor}</span>
                                <span className="dash-tarjeta-label">{t.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Dos columnas */}
            <div className="dash-columnas">
                <section className="dash-panel">
                    <div className="dash-panel-cabecera">
                        <Trophy size={20} className="dash-panel-icono" />
                        <h2 className="dash-panel-titulo">Productos más vendidos</h2>
                    </div>
                    {productos.length === 0 ? (
                        <div className="dash-vacio">
                            <ShoppingBag size={40} strokeWidth={1.5} />
                            <p>Aún no hay ventas registradas.</p>
                        </div>
                    ) : (
                        <ul className="dash-ranking">
                            {productos.map((p, i) => (
                                <li className="dash-ranking-item" key={p.idProducto}>
                                    <span className={`dash-ranking-pos pos-${i + 1}`}>{i + 1}</span>
                                    <span className="dash-ranking-nombre">{p.nombre}</span>
                                    <span className="dash-ranking-cantidad">{p.cantidadVendida} uds</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <section className="dash-panel">
                    <div className="dash-panel-cabecera">
                        <TrendingUp size={20} className="dash-panel-icono" />
                        <h2 className="dash-panel-titulo">Pedidos por estado</h2>
                    </div>
                    <div className="dash-estados">
                        {estados.map((e) => (
                            <div className="dash-estado" key={e.clave}>
                                <span className="dash-estado-num" style={{ color: e.color }}>
                                    {porEstado[e.clave] || 0}
                                </span>
                                <span className="dash-estado-label">{e.etiqueta}</span>
                                <span className="dash-estado-barra" style={{ background: e.color }}></span>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default Dashboard;