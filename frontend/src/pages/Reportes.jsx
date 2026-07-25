import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import reportesService from '../services/reportesService';
import {
    TrendingUp, DollarSign, ShoppingCart, Package, Users,
    ArrowUpRight, ArrowDownRight, Trophy, Medal, Award
} from 'lucide-react';
import {
    AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import './Reportes.css';

const COLORES_ESTADO = {
    pendiente: '#f39c12',
    confirmado: '#3498db',
    en_preparacion: '#9b59b6',
    en_camino: '#1abc9c',
    entregado: '#27AE60',
    cancelado: '#e74c3c',
    reembolsado: '#95a5a6'
};

const ETIQUETAS_ESTADO = {
    pendiente: 'Pendiente',
    confirmado: 'Confirmado',
    en_preparacion: 'En preparación',
    en_camino: 'En camino',
    entregado: 'Entregado',
    cancelado: 'Cancelado',
    reembolsado: 'Reembolsado'
};

function Reportes() {
    const { usuario } = useAuth();
    const toast = useToast();
    const idEmpresa = usuario?.idEmpresa;

    const [resumen, setResumen] = useState(null);
    const [ventas, setVentas] = useState([]);
    const [productos, setProductos] = useState([]);
    const [pedidosEstado, setPedidosEstado] = useState([]);
    const [cargando, setCargando] = useState(true);

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const [resR, resV, resP, resE] = await Promise.all([
                reportesService.resumen(idEmpresa).catch(() => null),
                reportesService.ventas(idEmpresa).catch(() => null),
                reportesService.productosMasVendidos(idEmpresa, { limite: 6 }).catch(() => null),
                reportesService.pedidosPorEstado(idEmpresa).catch(() => null)
            ]);

            if (resR) setResumen(resR.data.data);

            if (resV) {
                const datos = resV.data.data?.ventas || resV.data.data?.ventasPorDia || resV.data.data || [];
                setVentas(Array.isArray(datos) ? datos : []);
            }

            if (resP) {
                const datos = resP.data.data?.productos || resP.data.data || [];
                setProductos(Array.isArray(datos) ? datos : []);
            }

            if (resE) {
                const datos = resE.data.data?.pedidos || resE.data.data?.estados || resE.data.data || [];
                const arr = Array.isArray(datos) ? datos : Object.entries(datos).map(([estado, cantidad]) => ({ estado, cantidad }));
                setPedidosEstado(arr);
            }
        } catch {
            toast.error('No se pudieron cargar algunos reportes.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    useEffect(() => { cargar(); }, [cargar]);

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const formatoMonedaCorto = (v) => {
        const n = parseFloat(v) || 0;
        if (n >= 1000000) return `$${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `$${(n / 1000).toFixed(0)}K`;
        return `$${n}`;
    };

    // Datos para el gráfico de ventas (normalizado)
    const datosVentas = ventas.map((v) => ({
        fecha: v.fecha || v.dia || v.periodo || '',
        total: parseFloat(v.total || v.monto || v.ventas || 0),
        pedidos: parseInt(v.pedidos || v.cantidad || 0, 10)
    }));

    // Datos para pie de estados
    const datosEstados = pedidosEstado.map((e) => ({
        nombre: ETIQUETAS_ESTADO[e.estado] || e.estado,
        valor: parseInt(e.cantidad || e.total || e.count || 0, 10),
        color: COLORES_ESTADO[e.estado] || '#95a5a6'
    })).filter(e => e.valor > 0);

    // Métricas del resumen
    const metricas = [
        {
            label: 'Ventas totales',
            valor: formatoMoneda(resumen?.ingresoTotal || resumen?.totalVentas || resumen?.ingresos),
            icono: DollarSign,
            fondo: 'linear-gradient(135deg, #27AE60, #1e8449)',
            halo: 'rgba(39,174,96,0.1)',
            sombra: 'rgba(39,174,96,0.4)'
        },
        {
            label: 'Pedidos totales',
            valor: resumen?.totalPedidos ?? resumen?.pedidos ?? 0,
            icono: ShoppingCart,
            fondo: 'linear-gradient(135deg, #2980b9, #1f6391)',
            halo: 'rgba(41,128,185,0.1)',
            sombra: 'rgba(41,128,185,0.4)'
        },
        {
            label: 'Productos activos',
            valor: resumen?.totalProductos ?? resumen?.productos ?? 0,
            icono: Package,
            fondo: 'linear-gradient(135deg, #8e44ad, #6c3483)',
            halo: 'rgba(142,68,173,0.1)',
            sombra: 'rgba(142,68,173,0.4)'
        },
        {
            label: 'Ticket promedio',
            valor: formatoMoneda(resumen?.ticketPromedio || resumen?.promedioVenta),
            icono: TrendingUp,
            fondo: 'linear-gradient(135deg, #e67e22, #ca6f1e)',
            halo: 'rgba(230,126,34,0.1)',
            sombra: 'rgba(230,126,34,0.4)'
        }
    ];

    const medallas = [
        { icono: Trophy, color: '#FFD700' },
        { icono: Medal, color: '#C0C0C0' },
        { icono: Award, color: '#CD7F32' }
    ];

    if (cargando) {
        return (
            <div className="reportes">
                <div className="rep-cabecera">
                    <div><h1>Reportes</h1><p>Analíticas de tu negocio</p></div>
                </div>
                <div className="rep-cargando"><div className="rep-spinner"></div><p>Generando reportes...</p></div>
            </div>
        );
    }

    return (
        <div className="reportes">
            <div className="rep-cabecera">
                <div>
                    <h1>Reportes</h1>
                    <p>Analíticas y métricas de tu negocio en tiempo real</p>
                </div>
            </div>

            {/* MÉTRICAS PRINCIPALES */}
            <div className="rep-metricas">
                {metricas.map((m, i) => {
                    const Icono = m.icono;
                    return (
                        <div
                            className="rep-metrica"
                            key={i}
                            style={{ '--rep-halo': m.halo, '--rep-sombra-icono': m.sombra }}
                        >
                            <div className="rep-metrica-icono" style={{ background: m.fondo }}>
                                <Icono size={26} />
                            </div>
                            <div className="rep-metrica-info">
                                <span className="rep-metrica-valor">{m.valor}</span>
                                <span className="rep-metrica-label">{m.label}</span>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* GRÁFICO DE VENTAS */}
            <div className="rep-panel rep-panel-ancho">
                <div className="rep-panel-cabecera">
                    <div className="rep-panel-titulo-grupo">
                        <div className="rep-panel-icono" style={{ background: 'linear-gradient(135deg, #27AE60, #1e8449)' }}>
                            <TrendingUp size={22} />
                        </div>
                        <div>
                            <h2>Evolución de ventas</h2>
                            <p>Ingresos a lo largo del tiempo</p>
                        </div>
                    </div>
                </div>
                {datosVentas.length === 0 ? (
                    <div className="rep-sin-datos">No hay datos de ventas en el período.</div>
                ) : (
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={datosVentas} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#27AE60" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#27AE60" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#eef0f3" vertical={false} />
                            <XAxis dataKey="fecha" tick={{ fontSize: 12, fill: '#7f8c8d' }} axisLine={false} tickLine={false} />
                            <YAxis tickFormatter={formatoMonedaCorto} tick={{ fontSize: 12, fill: '#7f8c8d' }} axisLine={false} tickLine={false} />
                            <Tooltip
                                formatter={(value) => [formatoMoneda(value), 'Ventas']}
                                contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                            />
                            <Area type="monotone" dataKey="total" stroke="#27AE60" strokeWidth={3} fill="url(#colorVentas)" />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            {/* FILA DE DOS PANELES */}
            <div className="rep-fila">
                {/* PRODUCTOS MÁS VENDIDOS */}
                <div className="rep-panel">
                    <div className="rep-panel-cabecera">
                        <div className="rep-panel-titulo-grupo">
                            <div className="rep-panel-icono" style={{ background: 'linear-gradient(135deg, #f39c12, #e67e22)' }}>
                                <Trophy size={22} />
                            </div>
                            <div>
                                <h2>Productos top</h2>
                                <p>Los más vendidos</p>
                            </div>
                        </div>
                    </div>
                    {productos.length === 0 ? (
                        <div className="rep-sin-datos">Sin datos de productos.</div>
                    ) : (
                        <div className="rep-ranking">
                            {productos.map((p, i) => (
                                <div className="rep-ranking-item" key={i}>
                                    <div className="rep-ranking-pos">
                                        {i < 3 ? (
                                            (() => { const M = medallas[i].icono; return <M size={20} style={{ color: medallas[i].color }} />; })()
                                        ) : (
                                            <span className="rep-ranking-num">{i + 1}</span>
                                        )}
                                    </div>
                                    <div className="rep-ranking-info">
                                        <span className="rep-ranking-nombre">{p.nombre || p.nombreProducto || 'Producto'}</span>
                                        <div className="rep-ranking-barra-fondo">
                                            <div
                                                className="rep-ranking-barra"
                                                style={{ width: `${Math.min(100, ((p.cantidadVendida || p.cantidad || p.totalVendido || 0) / (productos[0].cantidadVendida || productos[0].cantidad || productos[0].totalVendido || 1)) * 100)}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <span className="rep-ranking-valor">{p.cantidadVendida || p.cantidad || p.totalVendido || 0}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* PEDIDOS POR ESTADO */}
                <div className="rep-panel">
                    <div className="rep-panel-cabecera">
                        <div className="rep-panel-titulo-grupo">
                            <div className="rep-panel-icono" style={{ background: 'linear-gradient(135deg, #8e44ad, #6c3483)' }}>
                                <ShoppingCart size={22} />
                            </div>
                            <div>
                                <h2>Pedidos por estado</h2>
                                <p>Distribución actual</p>
                            </div>
                        </div>
                    </div>
                    {datosEstados.length === 0 ? (
                        <div className="rep-sin-datos">Sin datos de pedidos.</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={datosEstados}
                                    dataKey="valor"
                                    nameKey="nombre"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={95}
                                    paddingAngle={3}
                                >
                                    {datosEstados.map((e, i) => (
                                        <Cell key={i} fill={e.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value, name) => [`${value} pedidos`, name]}
                                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value) => <span style={{ fontSize: 13, color: '#5a6570' }}>{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Reportes;