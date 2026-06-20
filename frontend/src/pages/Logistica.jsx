import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import logisticaService from '../services/logisticaService';
import Modal from '../components/Modal';
import {
    Truck, MapPin, Plus, Bike, Car, User, Power, Trash2,
    Navigation, Clock, DollarSign, Package
} from 'lucide-react';
import './Logistica.css';

const VEHICULOS = {
    moto: { etiqueta: 'Moto', icono: Bike },
    carro: { etiqueta: 'Carro', icono: Car },
    bicicleta: { etiqueta: 'Bicicleta', icono: Bike },
    pie: { etiqueta: 'A pie', icono: User }
};

function Logistica() {
    const { usuario } = useAuth();
    const toast = useToast();
    const idEmpresa = usuario?.idEmpresa;

    const [pestana, setPestana] = useState('domiciliarios');

    // Domiciliarios
    const [domiciliarios, setDomiciliarios] = useState([]);
    const [cargandoDom, setCargandoDom] = useState(true);
    const [modalDom, setModalDom] = useState(false);
    const [domForm, setDomForm] = useState({ idUsuario: '', tipoVehiculo: 'moto', placa: '', documentoIdentidad: '', licenciaConduccion: '' });
    const [guardandoDom, setGuardandoDom] = useState(false);

    // Zonas
    const [zonas, setZonas] = useState([]);
    const [cargandoZonas, setCargandoZonas] = useState(true);
    const [modalZona, setModalZona] = useState(false);
    const [zonaForm, setZonaForm] = useState({ nombre: '', tipo: 'circulo', radioKm: '', costoAdicional: '', tiempoEstimadoMin: '' });
    const [guardandoZona, setGuardandoZona] = useState(false);

    const cargarDomiciliarios = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargandoDom(true);
            const res = await logisticaService.listarDomiciliarios(idEmpresa);
            setDomiciliarios(res.data.data?.domiciliarios || []);
        } catch {
            toast.error('No se pudieron cargar los domiciliarios.');
        } finally {
            setCargandoDom(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    const cargarZonas = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargandoZonas(true);
            const res = await logisticaService.listarZonas(idEmpresa);
            setZonas(res.data.data?.zonas || []);
        } catch {
            toast.error('No se pudieron cargar las zonas.');
        } finally {
            setCargandoZonas(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    useEffect(() => {
        if (pestana === 'domiciliarios') cargarDomiciliarios();
        if (pestana === 'zonas') cargarZonas();
    }, [pestana, cargarDomiciliarios, cargarZonas]);

    const cambiarDisponibilidad = async (dom) => {
        try {
            await logisticaService.cambiarDisponibilidad(dom.idDomiciliario, idEmpresa, !dom.disponible);
            toast.exito(dom.disponible ? 'Domiciliario marcado como no disponible.' : 'Domiciliario disponible.');
            cargarDomiciliarios();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cambiar la disponibilidad.');
        }
    };

    const desactivarDomiciliario = async (id) => {
        try {
            await logisticaService.desactivarDomiciliario(id, idEmpresa);
            toast.exito('Domiciliario desactivado.');
            cargarDomiciliarios();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo desactivar.');
        }
    };

    const crearDomiciliario = async (e) => {
        e.preventDefault();
        if (!domForm.documentoIdentidad) {
            toast.error('El documento de identidad es obligatorio.');
            return;
        }
        setGuardandoDom(true);
        try {
            await logisticaService.crearDomiciliario({ idEmpresa, ...domForm });
            toast.exito('Domiciliario creado.');
            setModalDom(false);
            setDomForm({ idUsuario: '', tipoVehiculo: 'moto', placa: '', documentoIdentidad: '', licenciaConduccion: '' });
            cargarDomiciliarios();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo crear el domiciliario.');
        } finally {
            setGuardandoDom(false);
        }
    };

    const crearZona = async (e) => {
        e.preventDefault();
        if (!zonaForm.nombre) {
            toast.error('El nombre de la zona es obligatorio.');
            return;
        }
        setGuardandoZona(true);
        try {
            await logisticaService.crearZona({
                idEmpresa,
                nombre: zonaForm.nombre,
                tipo: zonaForm.tipo,
                radioKm: zonaForm.radioKm ? parseFloat(zonaForm.radioKm) : undefined,
                costoAdicional: zonaForm.costoAdicional ? parseFloat(zonaForm.costoAdicional) : 0,
                tiempoEstimadoMin: zonaForm.tiempoEstimadoMin ? parseInt(zonaForm.tiempoEstimadoMin, 10) : undefined
            });
            toast.exito('Zona creada.');
            setModalZona(false);
            setZonaForm({ nombre: '', tipo: 'circulo', radioKm: '', costoAdicional: '', tiempoEstimadoMin: '' });
            cargarZonas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo crear la zona.');
        } finally {
            setGuardandoZona(false);
        }
    };

    const desactivarZona = async (id) => {
        try {
            await logisticaService.desactivarZona(id, idEmpresa);
            toast.exito('Zona desactivada.');
            cargarZonas();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo desactivar.');
        }
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    return (
        <div className="logistica">
            <div className="log-cabecera">
                <div>
                    <h1>Logística</h1>
                    <p>Gestiona domiciliarios y zonas de cobertura</p>
                </div>
                {pestana === 'domiciliarios' ? (
                    <button className="btn-primario" onClick={() => setModalDom(true)}>
                        <Plus size={18} /> Nuevo domiciliario
                    </button>
                ) : (
                    <button className="btn-primario" onClick={() => setModalZona(true)}>
                        <Plus size={18} /> Nueva zona
                    </button>
                )}
            </div>

            <div className="log-pestanas">
                <button className={`log-pestana ${pestana === 'domiciliarios' ? 'log-pestana-activa' : ''}`} onClick={() => setPestana('domiciliarios')}>
                    <Truck size={18} /> Domiciliarios
                </button>
                <button className={`log-pestana ${pestana === 'zonas' ? 'log-pestana-activa' : ''}`} onClick={() => setPestana('zonas')}>
                    <MapPin size={18} /> Zonas de cobertura
                </button>
            </div>

            {/* PESTAÑA DOMICILIARIOS */}
            {pestana === 'domiciliarios' && (
                cargandoDom ? (
                    <div className="log-cargando"><div className="log-spinner"></div><p>Cargando...</p></div>
                ) : domiciliarios.length === 0 ? (
                    <div className="log-vacio">
                        <Truck size={56} strokeWidth={1.3} />
                        <h3>No hay domiciliarios</h3>
                        <p>Registra repartidores para gestionar tus entregas a domicilio.</p>
                    </div>
                ) : (
                    <div className="log-grid">
                        {domiciliarios.map((d) => {
                            const veh = VEHICULOS[d.tipoVehiculo] || VEHICULOS.moto;
                            const Icono = veh.icono;
                            return (
                                <div className="log-dom-tarjeta" key={d.idDomiciliario}>
                                    <div className="log-dom-cabecera">
                                        <div className="log-dom-avatar"><Icono size={22} /></div>
                                        <span className={`log-dom-estado ${d.disponible ? 'log-disponible' : 'log-ocupado'}`}>
                                            {d.disponible ? 'Disponible' : 'No disponible'}
                                        </span>
                                    </div>
                                    <h3 className="log-dom-nombre">{d.nombreUsuario || d.nombre || 'Domiciliario'}</h3>
                                    <div className="log-dom-datos">
                                        <span><strong>Vehículo:</strong> {veh.etiqueta}</span>
                                        {d.placa && <span><strong>Placa:</strong> {d.placa}</span>}
                                        <span><strong>Documento:</strong> {d.documentoIdentidad}</span>
                                    </div>
                                    <div className="log-dom-acciones">
                                        <button className="log-btn-toggle" onClick={() => cambiarDisponibilidad(d)}>
                                            <Power size={15} /> {d.disponible ? 'Marcar ocupado' : 'Marcar libre'}
                                        </button>
                                        <button className="log-btn-eliminar" onClick={() => desactivarDomiciliario(d.idDomiciliario)}>
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )
            )}

            {/* PESTAÑA ZONAS */}
            {pestana === 'zonas' && (
                cargandoZonas ? (
                    <div className="log-cargando"><div className="log-spinner"></div><p>Cargando...</p></div>
                ) : zonas.length === 0 ? (
                    <div className="log-vacio">
                        <MapPin size={56} strokeWidth={1.3} />
                        <h3>No hay zonas de cobertura</h3>
                        <p>Define las zonas donde realizas entregas y su costo.</p>
                    </div>
                ) : (
                    <div className="log-grid">
                        {zonas.map((z) => (
                            <div className="log-zona-tarjeta" key={z.idZona}>
                                <div className="log-zona-icono"><Navigation size={20} /></div>
                                <h3 className="log-zona-nombre">{z.nombre}</h3>
                                <span className="log-zona-tipo">{z.tipo || 'circulo'}</span>
                                <div className="log-zona-datos">
                                    {z.radioKm != null && (
                                        <div className="log-zona-dato"><MapPin size={14} /> {z.radioKm} km</div>
                                    )}
                                    <div className="log-zona-dato"><DollarSign size={14} /> {formatoMoneda(z.costoAdicional)}</div>
                                    {z.tiempoEstimadoMin != null && (
                                        <div className="log-zona-dato"><Clock size={14} /> {z.tiempoEstimadoMin} min</div>
                                    )}
                                </div>
                                <button className="log-btn-eliminar log-zona-eliminar" onClick={() => desactivarZona(z.idZona)}>
                                    <Trash2 size={15} /> Desactivar
                                </button>
                            </div>
                        ))}
                    </div>
                )
            )}

            {/* Modal crear domiciliario */}
            <Modal abierto={modalDom} onCerrar={() => setModalDom(false)} titulo="Nuevo domiciliario" ancho="480px">
                <form className="log-form" onSubmit={crearDomiciliario}>
                    <div className="log-campo">
                        <label>ID de usuario (del repartidor)</label>
                        <input type="text" value={domForm.idUsuario} onChange={(e) => setDomForm((p) => ({ ...p, idUsuario: e.target.value }))} placeholder="UUID del usuario" />
                        <span className="log-ayuda">El repartidor debe ser un usuario registrado.</span>
                    </div>
                    <div className="log-campo">
                        <label>Tipo de vehículo</label>
                        <select value={domForm.tipoVehiculo} onChange={(e) => setDomForm((p) => ({ ...p, tipoVehiculo: e.target.value }))}>
                            <option value="moto">Moto</option>
                            <option value="carro">Carro</option>
                            <option value="bicicleta">Bicicleta</option>
                            <option value="pie">A pie</option>
                        </select>
                    </div>
                    <div className="log-campo">
                        <label>Placa</label>
                        <input type="text" value={domForm.placa} onChange={(e) => setDomForm((p) => ({ ...p, placa: e.target.value }))} placeholder="ABC123" />
                    </div>
                    <div className="log-campo">
                        <label>Documento de identidad *</label>
                        <input type="text" value={domForm.documentoIdentidad} onChange={(e) => setDomForm((p) => ({ ...p, documentoIdentidad: e.target.value }))} placeholder="1098765432" />
                    </div>
                    <div className="log-campo">
                        <label>Licencia de conducción</label>
                        <input type="text" value={domForm.licenciaConduccion} onChange={(e) => setDomForm((p) => ({ ...p, licenciaConduccion: e.target.value }))} placeholder="Opcional" />
                    </div>
                    <div className="log-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalDom(false)}>Cancelar</button>
                        <button type="submit" className="btn-primario" disabled={guardandoDom}>
                            {guardandoDom ? 'Creando...' : 'Crear domiciliario'}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal crear zona */}
            <Modal abierto={modalZona} onCerrar={() => setModalZona(false)} titulo="Nueva zona de cobertura" ancho="480px">
                <form className="log-form" onSubmit={crearZona}>
                    <div className="log-campo">
                        <label>Nombre de la zona *</label>
                        <input type="text" value={zonaForm.nombre} onChange={(e) => setZonaForm((p) => ({ ...p, nombre: e.target.value }))} placeholder="Ej: Centro, Norte..." />
                    </div>
                    <div className="log-campo">
                        <label>Tipo</label>
                        <select value={zonaForm.tipo} onChange={(e) => setZonaForm((p) => ({ ...p, tipo: e.target.value }))}>
                            <option value="circulo">Círculo (por radio)</option>
                            <option value="ciudad">Ciudad</option>
                            <option value="barrio">Barrio</option>
                            <option value="poligono">Polígono</option>
                        </select>
                    </div>
                    <div className="log-form-fila">
                        <div className="log-campo">
                            <label>Radio (km)</label>
                            <input type="number" value={zonaForm.radioKm} onChange={(e) => setZonaForm((p) => ({ ...p, radioKm: e.target.value }))} placeholder="5" min="0" step="any" />
                        </div>
                        <div className="log-campo">
                            <label>Tiempo estimado (min)</label>
                            <input type="number" value={zonaForm.tiempoEstimadoMin} onChange={(e) => setZonaForm((p) => ({ ...p, tiempoEstimadoMin: e.target.value }))} placeholder="30" min="1" />
                        </div>
                    </div>
                    <div className="log-campo">
                        <label>Costo adicional de domicilio</label>
                        <input type="number" value={zonaForm.costoAdicional} onChange={(e) => setZonaForm((p) => ({ ...p, costoAdicional: e.target.value }))} placeholder="0" min="0" step="any" />
                    </div>
                    <div className="log-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalZona(false)}>Cancelar</button>
                        <button type="submit" className="btn-primario" disabled={guardandoZona}>
                            {guardandoZona ? 'Creando...' : 'Crear zona'}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Logistica;