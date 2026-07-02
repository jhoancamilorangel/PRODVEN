import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import marketplaceService from '../services/marketplaceService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    ArrowLeft, MapPin, Store, Package, CreditCard, Banknote,
    Building2, Smartphone, CheckCircle2, ShoppingBag, Truck, Wallet, Loader2
} from 'lucide-react';
import './Checkout.css';

// Catálogo de métodos: cómo se muestran y cómo se traducen al backend
const CATALOGO_METODOS = {
    efectivo:         { etiqueta: 'Efectivo (contra entrega)', icono: Banknote,   grupo: 'recibir', tipoPago: 'contra_entrega' },
    transferencia:    { etiqueta: 'Transferencia bancaria',    icono: Building2,  grupo: 'recibir', tipoPago: 'contra_entrega' },
    tarjeta_credito:  { etiqueta: 'Tarjeta de crédito',        icono: CreditCard, grupo: 'linea',   tipoPago: 'digital' },
    tarjeta_debito:   { etiqueta: 'Tarjeta débito',            icono: CreditCard, grupo: 'linea',   tipoPago: 'digital' },
    pse:              { etiqueta: 'PSE',                        icono: Building2,  grupo: 'linea',   tipoPago: 'digital' },
    nequi:            { etiqueta: 'Nequi',                      icono: Smartphone, grupo: 'linea',   tipoPago: 'digital' },
    daviplata:        { etiqueta: 'Daviplata',                  icono: Smartphone, grupo: 'linea',   tipoPago: 'digital' }
};

function Checkout() {
    const { idEmpresa } = useParams();
    const navigate = useNavigate();
    const toast = useToast();

    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(false);
    const [tienda, setTienda] = useState(null);
    const [config, setConfig] = useState(null);
    const [carrito, setCarrito] = useState(null);
    const [items, setItems] = useState([]);

    // Selecciones del usuario
    const [tipoEntrega, setTipoEntrega] = useState('');
    const [direccion, setDireccion] = useState('');
    const [metodo, setMetodo] = useState('');
    const [notas, setNotas] = useState('');
    const [tarjeta, setTarjeta] = useState({ numero: '', nombre: '', expiracion: '', cvv: '', documento: '' });

    // Resultado final
    const [pedidoConfirmado, setPedidoConfirmado] = useState(null);

    const estaLogueado = () => !!localStorage.getItem('prodven_cli_token');

    const cargar = useCallback(async () => {
        if (!estaLogueado()) {
            toast.info('Inicia sesión para finalizar tu compra.');
            setTimeout(() => navigate('/cuenta'), 600);
            return;
        }
        try {
            setCargando(true);
            const [resTienda, resConfig, resCarrito] = await Promise.all([
                marketplaceService.obtenerTienda(idEmpresa).catch(() => null),
                marketplaceService.obtenerConfiguracionTienda(idEmpresa).catch(() => null),
                marketplaceService.obtenerCarrito(idEmpresa).catch(() => null)
            ]);

            const datosTienda = resTienda?.data?.data?.empresa || resTienda?.data?.data || null;
            const datosConfig = resConfig?.data?.data || null;
            const datosCarrito = resCarrito?.data?.data || null;

            setTienda(datosTienda);
            setConfig(datosConfig);
            setCarrito(datosCarrito?.carrito || null);
            setItems(datosCarrito?.items || []);

            if (datosTienda?.aceptaDomicilios) setTipoEntrega('domicilio');
            else if (datosTienda?.aceptaRecogerEnTienda) setTipoEntrega('recogida');
        } catch {
            toast.error('No se pudo cargar el checkout.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idEmpresa]);

    useEffect(() => { cargar(); }, [cargar]);

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    const metodosDisponibles = () => {
        const disponibles = config?.metodosPagoDisponibles || [];
        return Object.keys(CATALOGO_METODOS).filter((m) => disponibles.includes(m));
    };

    const subtotal = parseFloat(carrito?.total || carrito?.subtotal || 0);
    const metodoNecesitaTarjeta = metodo === 'tarjeta_credito' || metodo === 'tarjeta_debito';
    const esDomicilio = tipoEntrega === 'domicilio';
    const costoDomicilio = esDomicilio ? parseFloat(config?.costoDomicilioBase || 0) : 0;
    const totalFinal = subtotal + costoDomicilio;
    const montoMinimo = parseFloat(config?.montoMinimoPedido || 0);

    const puedeConfirmar = () => {
        if (procesando) return false;
        if (items.length === 0) return false;
        if (!tipoEntrega) return false;
        if (esDomicilio && !direccion.trim()) return false;
        if (!metodo) return false;
        if (subtotal < montoMinimo) return false;
        if (metodoNecesitaTarjeta) {
            if (!tarjeta.numero.trim() || !tarjeta.nombre.trim() || !tarjeta.expiracion.trim() || !tarjeta.cvv.trim()) return false;
        }
        return true;
    };

    const confirmar = async () => {
        if (!puedeConfirmar()) return;
        const infoMetodo = CATALOGO_METODOS[metodo];
        setProcesando(true);
        try {
            // 1. Crear el pedido
            const resPedido = await marketplaceService.crearPedido(idEmpresa, {
                tipoEntrega,
                tipoPago: infoMetodo.tipoPago,
                costoDomicilio,
                direccionEnvio: esDomicilio ? direccion.trim() : null,
                notas: notas.trim() || null
            });

            const pedido = resPedido.data.data;

            // 2. Si es pago en línea, procesar con PayU
            if (infoMetodo.grupo === 'linea') {
                try {
                    const resPago = await marketplaceService.pagarPedido(pedido.idPedido, {
                        metodo,
                        comprador: {
                            nombre: tarjeta.nombre || undefined,
                            documento: tarjeta.documento || undefined
                        },
                        tarjeta: metodoNecesitaTarjeta ? {
                            numero: tarjeta.numero.replace(/\s/g, ''),
                            nombre: tarjeta.nombre,
                            expiracion: tarjeta.expiracion,
                            cvv: tarjeta.cvv
                        } : null
                    });
                    const estadoPago = resPago.data.data?.resultadoPasarela?.estado;
                    setPedidoConfirmado({ pedido, metodo, estadoPago, enLinea: true });
                } catch (errorPago) {
                    toast.error('El pedido se creó, pero el pago no se completó. Puedes reintentar el pago desde "Mis compras".');
                    setPedidoConfirmado({ pedido, metodo, estadoPago: 'fallido', enLinea: true });
                }
            } else {
                setPedidoConfirmado({ pedido, metodo, enLinea: false });
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo crear el pedido.');
        } finally {
            setProcesando(false);
        }
    };

    // ===== PANTALLA DE CARGA =====
    if (cargando) {
        return (
            <div className="chk">
                <MarketplaceHeader />
                <div className="chk-cargando"><div className="chk-spinner"></div><p>Preparando tu compra...</p></div>
            </div>
        );
    }

    // ===== PANTALLA DE CONFIRMACIÓN =====
    if (pedidoConfirmado) {
        const p = pedidoConfirmado.pedido;
        const exitoLinea = pedidoConfirmado.enLinea && pedidoConfirmado.estadoPago === 'completado';
        const falloLinea = pedidoConfirmado.enLinea && pedidoConfirmado.estadoPago !== 'completado';
        return (
            <div className="chk">
                <MarketplaceHeader />
                <div className="chk-exito">
                    <div className={`chk-exito-icono ${falloLinea ? 'chk-exito-icono-warn' : ''}`}>
                        <CheckCircle2 size={54} />
                    </div>
                    <h1>{falloLinea ? 'Pedido creado' : '¡Pedido confirmado!'}</h1>
                    <p className="chk-exito-numero">N.° {p.numeroPedido}</p>
                    <p className="chk-exito-msg">
                        {exitoLinea && 'Tu pago fue procesado y el pedido está confirmado. La tienda comenzará a prepararlo.'}
                        {falloLinea && 'Tu pedido quedó registrado, pero el pago en línea no se completó. Puedes reintentarlo desde "Mis compras".'}
                        {!pedidoConfirmado.enLinea && pedidoConfirmado.metodo === 'transferencia' &&
                            'Tu pedido quedó registrado. Realiza la transferencia y la tienda confirmará tu pago.'}
                        {!pedidoConfirmado.enLinea && pedidoConfirmado.metodo === 'efectivo' &&
                            'Tu pedido quedó registrado. Pagarás en efectivo al recibirlo.'}
                    </p>
                    <div className="chk-exito-resumen">
                        <div><span>Total</span><strong>{formatoMoneda(p.total)}</strong></div>
                        <div><span>Estado</span><strong>{p.etiquetaEstado || 'Pendiente'}</strong></div>
                    </div>
                    <div className="chk-exito-acciones">
                        <button className="chk-btn-secundario" onClick={() => navigate('/marketplace')}>
                            Seguir comprando
                        </button>
                        <button className="chk-btn-primario" onClick={() => navigate('/mis-compras')}>
                            Ver mis compras
                        </button>
                    </div>
                </div>
                <MarketplaceFooter />
            </div>
        );
    }

    // ===== CARRITO VACÍO =====
    if (items.length === 0) {
        return (
            <div className="chk">
                <MarketplaceHeader />
                <div className="chk-vacio">
                    <ShoppingBag size={60} strokeWidth={1.2} />
                    <h3>No hay productos para esta tienda</h3>
                    <p>Agrega productos al carrito antes de finalizar la compra.</p>
                    <button className="chk-btn-primario" onClick={() => navigate(`/tienda/${idEmpresa}`)}>
                        Ir a la tienda
                    </button>
                </div>
                <MarketplaceFooter />
            </div>
        );
    }

    const metodos = metodosDisponibles();
    const metodosRecibir = metodos.filter((m) => CATALOGO_METODOS[m].grupo === 'recibir');
    const metodosLinea = metodos.filter((m) => CATALOGO_METODOS[m].grupo === 'linea');

    return (
        <div className="chk">
            <MarketplaceHeader />

            <main className="chk-main">
                <button className="chk-volver" onClick={() => navigate('/carrito')}>
                    <ArrowLeft size={18} /> Volver al carrito
                </button>

                <div className="chk-cabecera">
                    <h1>Finalizar compra</h1>
                    {tienda && (
                        <div className="chk-tienda">
                            <div className="chk-tienda-logo">
                                {tienda.logoUrl ? <img src={tienda.logoUrl} alt={tienda.nombre} /> : <Store size={18} />}
                            </div>
                            <span>{tienda.nombre}</span>
                        </div>
                    )}
                </div>

                <div className="chk-contenido">
                    <div className="chk-columna">
                        {/* ENTREGA */}
                        <section className="chk-seccion">
                            <h2><Truck size={19} /> ¿Cómo quieres recibir tu pedido?</h2>
                            <div className="chk-opciones">
                                {tienda?.aceptaDomicilios && (
                                    <button
                                        className={`chk-opcion ${tipoEntrega === 'domicilio' ? 'chk-opcion-activa' : ''}`}
                                        onClick={() => setTipoEntrega('domicilio')}
                                    >
                                        <MapPin size={20} />
                                        <span>Domicilio</span>
                                        {parseFloat(config?.costoDomicilioBase || 0) > 0 &&
                                            <small>{formatoMoneda(config.costoDomicilioBase)}</small>}
                                    </button>
                                )}
                                {tienda?.aceptaRecogerEnTienda && (
                                    <button
                                        className={`chk-opcion ${tipoEntrega === 'recogida' ? 'chk-opcion-activa' : ''}`}
                                        onClick={() => setTipoEntrega('recogida')}
                                    >
                                        <Store size={20} />
                                        <span>Recoger en tienda</span>
                                        <small>Gratis</small>
                                    </button>
                                )}
                            </div>

                            {esDomicilio && (
                                <div className="chk-campo">
                                    <label>Dirección de entrega</label>
                                    <input
                                        type="text"
                                        value={direccion}
                                        onChange={(e) => setDireccion(e.target.value)}
                                        placeholder="Calle, número, barrio, referencias..."
                                    />
                                </div>
                            )}
                        </section>

                        {/* MÉTODO DE PAGO */}
                        <section className="chk-seccion">
                            <h2><Wallet size={19} /> Método de pago</h2>
                            {metodos.length === 0 ? (
                                <p className="chk-sin-metodos">Esta tienda no tiene métodos de pago configurados. Contáctala directamente.</p>
                            ) : (
                                <>
                                    {metodosRecibir.length > 0 && (
                                        <div className="chk-metodos-grupo">
                                            <span className="chk-metodos-titulo">Pago al recibir</span>
                                            {metodosRecibir.map((m) => {
                                                const Icono = CATALOGO_METODOS[m].icono;
                                                return (
                                                    <button key={m} className={`chk-metodo ${metodo === m ? 'chk-metodo-activo' : ''}`} onClick={() => setMetodo(m)}>
                                                        <Icono size={20} />
                                                        <span>{CATALOGO_METODOS[m].etiqueta}</span>
                                                        <span className="chk-metodo-radio"></span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {metodosLinea.length > 0 && (
                                        <div className="chk-metodos-grupo">
                                            <span className="chk-metodos-titulo">Pago en línea</span>
                                            {metodosLinea.map((m) => {
                                                const Icono = CATALOGO_METODOS[m].icono;
                                                return (
                                                    <button key={m} className={`chk-metodo ${metodo === m ? 'chk-metodo-activo' : ''}`} onClick={() => setMetodo(m)}>
                                                        <Icono size={20} />
                                                        <span>{CATALOGO_METODOS[m].etiqueta}</span>
                                                        <span className="chk-metodo-radio"></span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                    {metodoNecesitaTarjeta && (
                                        <div className="chk-tarjeta">
                                            <div className="chk-campo">
                                                <label>Número de tarjeta</label>
                                                <input type="text" inputMode="numeric" maxLength="19"
                                                    value={tarjeta.numero}
                                                    onChange={(e) => setTarjeta({ ...tarjeta, numero: e.target.value })}
                                                    placeholder="4097 4400 0000 0004" />
                                            </div>
                                            <div className="chk-campo">
                                                <label>Nombre en la tarjeta</label>
                                                <input type="text"
                                                    value={tarjeta.nombre}
                                                    onChange={(e) => setTarjeta({ ...tarjeta, nombre: e.target.value })}
                                                    placeholder="Como aparece en la tarjeta" />
                                            </div>
                                            <div className="chk-tarjeta-fila">
                                                <div className="chk-campo">
                                                    <label>Vencimiento</label>
                                                    <input type="text" maxLength="7"
                                                        value={tarjeta.expiracion}
                                                        onChange={(e) => setTarjeta({ ...tarjeta, expiracion: e.target.value })}
                                                        placeholder="2028/12" />
                                                </div>
                                                <div className="chk-campo">
                                                    <label>CVV</label>
                                                    <input type="text" inputMode="numeric" maxLength="4"
                                                        value={tarjeta.cvv}
                                                        onChange={(e) => setTarjeta({ ...tarjeta, cvv: e.target.value })}
                                                        placeholder="123" />
                                                </div>
                                            </div>
                                            <div className="chk-campo">
                                                <label>Documento del titular</label>
                                                <input type="text" inputMode="numeric"
                                                    value={tarjeta.documento}
                                                    onChange={(e) => setTarjeta({ ...tarjeta, documento: e.target.value })}
                                                    placeholder="Cédula" />
                                            </div>
                                            <p className="chk-tarjeta-nota">Pago protegido y procesado por PayU.</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </section>

                        {/* NOTAS */}
                        <section className="chk-seccion">
                            <h2>Notas del pedido (opcional)</h2>
                            <textarea
                                className="chk-notas"
                                value={notas}
                                onChange={(e) => setNotas(e.target.value)}
                                rows="3"
                                placeholder="Instrucciones especiales para la tienda..."
                            />
                        </section>
                    </div>

                    {/* RESUMEN */}
                    <aside className="chk-resumen">
                        <h2>Tu pedido</h2>
                        <div className="chk-resumen-items">
                            {items.map((it) => {
                                const nombre = it.nombreProducto || it.producto?.nombre || 'Producto';
                                const precio = it.precioUnitario || 0;
                                const cant = it.cantidad || 1;
                                return (
                                    <div className="chk-resumen-item" key={it.idItem || it.idProducto}>
                                        <div className="chk-resumen-item-img">
                                            {it.imagenProducto ? <img src={it.imagenProducto} alt={nombre} /> : <Package size={20} />}
                                            <span className="chk-resumen-item-cant">{cant}</span>
                                        </div>
                                        <span className="chk-resumen-item-nombre">{nombre}</span>
                                        <span className="chk-resumen-item-precio">{formatoMoneda(precio * cant)}</span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="chk-resumen-totales">
                            <div className="chk-resumen-linea">
                                <span>Subtotal</span>
                                <span>{formatoMoneda(subtotal)}</span>
                            </div>
                            <div className="chk-resumen-linea">
                                <span>Domicilio</span>
                                <span>{costoDomicilio > 0 ? formatoMoneda(costoDomicilio) : (esDomicilio ? 'A convenir' : 'Gratis')}</span>
                            </div>
                            <div className="chk-resumen-total">
                                <span>Total</span>
                                <span>{formatoMoneda(totalFinal)}</span>
                            </div>
                        </div>

                        {subtotal < montoMinimo && (
                            <p className="chk-aviso-minimo">
                                El pedido mínimo de esta tienda es {formatoMoneda(montoMinimo)}.
                            </p>
                        )}

                        <button className="chk-confirmar" onClick={confirmar} disabled={!puedeConfirmar()}>
                            {procesando ? (<><Loader2 size={18} className="chk-girando" /> Procesando...</>) : 'Confirmar pedido'}
                        </button>
                    </aside>
                </div>
            </main>

            <MarketplaceFooter />
        </div>
    );
}

export default Checkout;