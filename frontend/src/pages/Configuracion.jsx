import { useState, useEffect, useCallback } from 'react';
import { useToast } from '../context/ToastContext';
import configuracionService from '../services/configuracionService';
import {
    Settings, Palette, CreditCard, Truck, Wrench,
    Save, DollarSign, Percent, Clock, Globe, FileText, Power, Check
} from 'lucide-react';
import './Configuracion.css';

const PESTANAS = [
    { id: 'general', etiqueta: 'General', icono: Settings, color: '#163b73' },
    { id: 'apariencia', etiqueta: 'Apariencia', icono: Palette, color: '#9b59b6' },
    { id: 'pagos', etiqueta: 'Pagos', icono: CreditCard, color: '#27AE60' },
    { id: 'domicilios', etiqueta: 'Domicilios', icono: Truck, color: '#e67e22' },
    { id: 'avanzado', etiqueta: 'Avanzado', icono: Wrench, color: '#e74c3c' }
];

const METODOS_PAGO = [
    { campo: 'aceptaEfectivo', etiqueta: 'Efectivo' },
    { campo: 'aceptaTarjetaCredito', etiqueta: 'Tarjeta de crédito' },
    { campo: 'aceptaTarjetaDebito', etiqueta: 'Tarjeta débito' },
    { campo: 'aceptaTransferencia', etiqueta: 'Transferencia' },
    { campo: 'aceptaPse', etiqueta: 'PSE' },
    { campo: 'aceptaNequi', etiqueta: 'Nequi' },
    { campo: 'aceptaDaviplata', etiqueta: 'Daviplata' },
    { campo: 'aceptaPayU', etiqueta: 'PayU' }
];

function Configuracion() {
    const toast = useToast();

    const [pestana, setPestana] = useState('general');
    const [config, setConfig] = useState(null);
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);

    const cargar = useCallback(async () => {
        try {
            setCargando(true);
            const res = await configuracionService.obtener();
            setConfig(res.data.data || {});
        } catch {
            toast.error('No se pudo cargar la configuración.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const setCampo = (campo, valor) => {
        setConfig((p) => ({ ...p, [campo]: valor }));
    };

    const guardarGeneral = async () => {
        setGuardando(true);
        try {
            await configuracionService.actualizar({
                moneda: config.moneda,
                simboloMoneda: config.simboloMoneda,
                zonaHoraria: config.zonaHoraria,
                iva: config.iva ? parseFloat(config.iva) : undefined,
                aplicaIva: config.aplicaIva,
                prefijoFactura: config.prefijoFactura,
                mensajeBienvenida: config.mensajeBienvenida,
                mensajeAgradecimiento: config.mensajeAgradecimiento
            });
            toast.exito('Configuración general guardada.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo guardar.');
        } finally {
            setGuardando(false);
        }
    };

    const guardarColores = async () => {
        setGuardando(true);
        try {
            await configuracionService.actualizarColores({
                colorPrimario: config.colorPrimario,
                colorSecundario: config.colorSecundario,
                colorTexto: config.colorTexto,
                colorFondo: config.colorFondo,
                fuentePrincipal: config.fuentePrincipal
            });
            toast.exito('Apariencia guardada.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo guardar.');
        } finally {
            setGuardando(false);
        }
    };

    const guardarMetodosPago = async () => {
        setGuardando(true);
        try {
            const datos = {};
            METODOS_PAGO.forEach((m) => { datos[m.campo] = !!config[m.campo]; });
            await configuracionService.actualizarMetodosPago(datos);
            toast.exito('Métodos de pago guardados.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo guardar.');
        } finally {
            setGuardando(false);
        }
    };

    const guardarDomicilios = async () => {
        setGuardando(true);
        try {
            await configuracionService.actualizar({
                radioDomicilioKm: config.radioDomicilioKm ? parseFloat(config.radioDomicilioKm) : undefined,
                costoDomicilio: config.costoDomicilio ? parseFloat(config.costoDomicilio) : undefined,
                tiempoEntregaMinutos: config.tiempoEntregaMinutos ? parseInt(config.tiempoEntregaMinutos, 10) : undefined,
                permiteContraEntrega: config.permiteContraEntrega
            });
            toast.exito('Configuración de domicilios guardada.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo guardar.');
        } finally {
            setGuardando(false);
        }
    };

    const toggleMantenimiento = async () => {
        setGuardando(true);
        try {
            const nuevoEstado = !config.modoMantenimiento;
            await configuracionService.toggleMantenimiento(nuevoEstado, config.mensajeMantenimiento);
            setCampo('modoMantenimiento', nuevoEstado);
            toast.exito(nuevoEstado ? 'Modo mantenimiento activado.' : 'Modo mantenimiento desactivado.');
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cambiar.');
        } finally {
            setGuardando(false);
        }
    };

    if (cargando) {
        return (
            <div className="conf">
                <div className="conf-cargando"><div className="conf-spinner"></div><p>Cargando configuración...</p></div>
            </div>
        );
    }

    const Interruptor = ({ activo, onChange }) => (
        <button className={`conf-switch ${activo ? 'conf-switch-on' : ''}`} onClick={onChange} type="button">
            <span className="conf-switch-bola"></span>
        </button>
    );

    return (
        <div className="conf">
            <div className="conf-cabecera">
                <div className="conf-cabecera-titulo">
                    <div className="conf-cabecera-icono"><Settings size={26} /></div>
                    <div>
                        <h1>Configuración</h1>
                        <p>Personaliza el comportamiento de tu negocio</p>
                    </div>
                </div>
            </div>

            <div className="conf-layout">
                {/* Menú lateral de pestañas */}
                <div className="conf-menu">
                    {PESTANAS.map((p) => {
                        const Icono = p.icono;
                        return (
                            <button
                                key={p.id}
                                className={`conf-menu-item ${pestana === p.id ? 'conf-menu-item-activo' : ''}`}
                                onClick={() => setPestana(p.id)}
                            >
                                <span className="conf-menu-icono" style={{ background: pestana === p.id ? p.color : `${p.color}15`, color: pestana === p.id ? '#fff' : p.color }}>
                                    <Icono size={18} />
                                </span>
                                {p.etiqueta}
                            </button>
                        );
                    })}
                </div>

                {/* Contenido */}
                <div className="conf-contenido">
                    {/* GENERAL */}
                    {pestana === 'general' && (
                        <div className="conf-seccion">
                            <h2><Globe size={20} /> Datos generales</h2>
                            <div className="conf-grid">
                                <div className="conf-campo">
                                    <label>Moneda</label>
                                    <input type="text" value={config.moneda || ''} onChange={(e) => setCampo('moneda', e.target.value)} placeholder="COP" />
                                </div>
                                <div className="conf-campo">
                                    <label>Símbolo de moneda</label>
                                    <input type="text" value={config.simboloMoneda || ''} onChange={(e) => setCampo('simboloMoneda', e.target.value)} placeholder="$" />
                                </div>
                                <div className="conf-campo">
                                    <label>Zona horaria</label>
                                    <input type="text" value={config.zonaHoraria || ''} onChange={(e) => setCampo('zonaHoraria', e.target.value)} placeholder="America/Bogota" />
                                </div>
                                <div className="conf-campo">
                                    <label>Prefijo de factura</label>
                                    <input type="text" value={config.prefijoFactura || ''} onChange={(e) => setCampo('prefijoFactura', e.target.value)} placeholder="FAC" />
                                </div>
                                <div className="conf-campo">
                                    <label>IVA (%)</label>
                                    <input type="number" value={config.iva || ''} onChange={(e) => setCampo('iva', e.target.value)} placeholder="19" min="0" step="any" />
                                </div>
                                <div className="conf-campo conf-campo-switch">
                                    <label>Aplica IVA</label>
                                    <Interruptor activo={config.aplicaIva} onChange={() => setCampo('aplicaIva', !config.aplicaIva)} />
                                </div>
                            </div>
                            <div className="conf-campo">
                                <label>Mensaje de bienvenida</label>
                                <textarea value={config.mensajeBienvenida || ''} onChange={(e) => setCampo('mensajeBienvenida', e.target.value)} rows="2" placeholder="Bienvenido a nuestra tienda..." />
                            </div>
                            <div className="conf-campo">
                                <label>Mensaje de agradecimiento</label>
                                <textarea value={config.mensajeAgradecimiento || ''} onChange={(e) => setCampo('mensajeAgradecimiento', e.target.value)} rows="2" placeholder="Gracias por tu compra..." />
                            </div>
                            <div className="conf-acciones">
                                <button className="btn-primario" onClick={guardarGeneral} disabled={guardando}>
                                    <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar cambios'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* APARIENCIA */}
                    {pestana === 'apariencia' && (
                        <div className="conf-seccion">
                            <h2><Palette size={20} /> Colores de marca</h2>
                            <p className="conf-descripcion">Estos colores definen la identidad visual de tu tienda pública.</p>
                            <div className="conf-colores">
                                {[
                                    { campo: 'colorPrimario', etiqueta: 'Color primario' },
                                    { campo: 'colorSecundario', etiqueta: 'Color secundario' },
                                    { campo: 'colorTexto', etiqueta: 'Color de texto' },
                                    { campo: 'colorFondo', etiqueta: 'Color de fondo' }
                                ].map((c) => (
                                    <div className="conf-color-item" key={c.campo}>
                                        <div className="conf-color-muestra" style={{ background: config[c.campo] || '#ccc' }}>
                                            <input type="color" value={config[c.campo] || '#000000'} onChange={(e) => setCampo(c.campo, e.target.value)} />
                                        </div>
                                        <div className="conf-color-info">
                                            <span className="conf-color-etiqueta">{c.etiqueta}</span>
                                            <span className="conf-color-valor">{config[c.campo] || '—'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="conf-campo">
                                <label>Fuente principal</label>
                                <input type="text" value={config.fuentePrincipal || ''} onChange={(e) => setCampo('fuentePrincipal', e.target.value)} placeholder="Inter" />
                            </div>
                            <div className="conf-acciones">
                                <button className="btn-primario" onClick={guardarColores} disabled={guardando}>
                                    <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar apariencia'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* PAGOS */}
                    {pestana === 'pagos' && (
                        <div className="conf-seccion">
                            <h2><CreditCard size={20} /> Métodos de pago aceptados</h2>
                            <p className="conf-descripcion">Activa los métodos de pago que tu negocio acepta.</p>
                            <div className="conf-metodos">
                                {METODOS_PAGO.map((m) => (
                                    <div className="conf-metodo" key={m.campo}>
                                        <span>{m.etiqueta}</span>
                                        <Interruptor activo={config[m.campo]} onChange={() => setCampo(m.campo, !config[m.campo])} />
                                    </div>
                                ))}
                            </div>
                            <div className="conf-acciones">
                                <button className="btn-primario" onClick={guardarMetodosPago} disabled={guardando}>
                                    <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar métodos'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* DOMICILIOS */}
                    {pestana === 'domicilios' && (
                        <div className="conf-seccion">
                            <h2><Truck size={20} /> Domicilios</h2>
                            <div className="conf-grid">
                                <div className="conf-campo">
                                    <label>Radio de domicilio (km)</label>
                                    <input type="number" value={config.radioDomicilioKm || ''} onChange={(e) => setCampo('radioDomicilioKm', e.target.value)} placeholder="5" min="0" step="any" />
                                </div>
                                <div className="conf-campo">
                                    <label>Costo de domicilio</label>
                                    <input type="number" value={config.costoDomicilio || ''} onChange={(e) => setCampo('costoDomicilio', e.target.value)} placeholder="0" min="0" step="any" />
                                </div>
                                <div className="conf-campo">
                                    <label>Tiempo de entrega (min)</label>
                                    <input type="number" value={config.tiempoEntregaMinutos || ''} onChange={(e) => setCampo('tiempoEntregaMinutos', e.target.value)} placeholder="30" min="1" />
                                </div>
                                <div className="conf-campo conf-campo-switch">
                                    <label>Permite contra entrega</label>
                                    <Interruptor activo={config.permiteContraEntrega} onChange={() => setCampo('permiteContraEntrega', !config.permiteContraEntrega)} />
                                </div>
                            </div>
                            <div className="conf-acciones">
                                <button className="btn-primario" onClick={guardarDomicilios} disabled={guardando}>
                                    <Save size={18} /> {guardando ? 'Guardando...' : 'Guardar domicilios'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* AVANZADO */}
                    {pestana === 'avanzado' && (
                        <div className="conf-seccion">
                            <h2><Wrench size={20} /> Opciones avanzadas</h2>
                            <div className={`conf-mantenimiento ${config.modoMantenimiento ? 'conf-mantenimiento-activo' : ''}`}>
                                <div className="conf-mantenimiento-info">
                                    <Power size={22} />
                                    <div>
                                        <h3>Modo mantenimiento</h3>
                                        <p>{config.modoMantenimiento ? 'Tu tienda está en mantenimiento. Los clientes ven un aviso.' : 'Tu tienda está operativa.'}</p>
                                    </div>
                                </div>
                                <Interruptor activo={config.modoMantenimiento} onChange={toggleMantenimiento} />
                            </div>
                            <div className="conf-campo">
                                <label>Mensaje de mantenimiento</label>
                                <textarea value={config.mensajeMantenimiento || ''} onChange={(e) => setCampo('mensajeMantenimiento', e.target.value)} rows="2" placeholder="Estamos en mantenimiento, volveremos pronto..." />
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default Configuracion;