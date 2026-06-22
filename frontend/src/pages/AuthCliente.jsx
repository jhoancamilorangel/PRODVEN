import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import authClienteService from '../services/authClienteService';
import {
    Store, Mail, Lock, User, Phone, ArrowRight, ArrowLeft,
    ShieldCheck, Check, X, KeyRound
} from 'lucide-react';
import './AuthCliente.css';

function AuthCliente() {
    const navigate = useNavigate();
    const toast = useToast();

    // modo: 'login' | 'registro' | 'verificar' | 'recuperar' | 'reset'
    const [modo, setModo] = useState('login');
    const [cargando, setCargando] = useState(false);

    const [form, setForm] = useState({
        nombres: '', apellidos: '', correo: '', password: '', telefono: ''
    });
    const [codigo, setCodigo] = useState('');
    const [passwordNueva, setPasswordNueva] = useState('');

    const setCampo = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

    // Reglas de contraseña (para mostrar en vivo)
    const reglasPassword = (pass) => ({
        longitud: pass.length >= 8,
        mayuscula: /[A-Z]/.test(pass),
        minuscula: /[a-z]/.test(pass),
        numero: /[0-9]/.test(pass),
        simbolo: /[!@#$%^&*(),.?":{}|<>]/.test(pass)
    });

    const passwordValida = (pass) => {
        const r = reglasPassword(pass);
        return r.longitud && r.mayuscula && r.minuscula && r.numero && r.simbolo;
    };

    const mostrarError = (error, fallback) => {
        const errores = error?.response?.data?.errores;
        if (errores && errores.length > 0) {
            toast.error(errores[0].mensaje);
        } else {
            toast.error(error?.response?.data?.message || fallback);
        }
    };

    // ---- LOGIN ----
    const hacerLogin = async (e) => {
        e.preventDefault();
        if (!form.correo || !form.password) {
            toast.error('Ingresa tu correo y contraseña.');
            return;
        }
        setCargando(true);
        try {
            const res = await authClienteService.login(form.correo, form.password);
            const data = res.data.data;

            if (data.requiere2FA) {
                toast.info('Te enviamos un código de verificación.');
                setCargando(false);
                setTimeout(() => setModo('verificar'), 50);
                return;
            }

            localStorage.setItem('prodven_token', data.accessToken);
            localStorage.setItem('prodven_refresh', data.refreshToken);
            localStorage.setItem('prodven_usuario', JSON.stringify(data.usuario));

            toast.exito(`¡Bienvenido, ${data.usuario.nombres}!`);
            setTimeout(() => navigate('/marketplace'), 50);
        } catch (error) {
            const msg = error?.response?.data?.message || '';
            if (msg.toLowerCase().includes('verificar tu correo')) {
                toast.info('Debes verificar tu correo. Revisa tu bandeja.');
                setTimeout(() => setModo('verificar'), 50);
            } else {
                mostrarError(error, 'No se pudo iniciar sesión.');
            }
            setCargando(false);
        }
    };

    // ---- REGISTRO ----
    const hacerRegistro = async (e) => {
        e.preventDefault();
        if (!form.nombres || !form.apellidos || !form.correo || !form.password) {
            toast.error('Completa todos los campos obligatorios.');
            return;
        }
        if (!passwordValida(form.password)) {
            toast.error('La contraseña no cumple todos los requisitos.');
            return;
        }
        setCargando(true);
        try {
            const datos = {
                nombres: form.nombres.trim(),
                apellidos: form.apellidos.trim(),
                correo: form.correo.trim(),
                password: form.password,
                rol: 'cliente'
            };
            if (form.telefono && form.telefono.trim().length >= 7) {
                datos.telefono = form.telefono.trim();
            }
            await authClienteService.registrar(datos);
            toast.exito('¡Cuenta creada! Revisa tu correo para el código.');
            setCargando(false);
            setTimeout(() => setModo('verificar'), 50);
        } catch (error) {
            mostrarError(error, 'No se pudo crear la cuenta. Intenta de nuevo.');
            setCargando(false);
        }
    };

    // ---- VERIFICAR CORREO ----
    const hacerVerificacion = async (e) => {
        e.preventDefault();
        if (!codigo || codigo.length < 6) {
            toast.error('Ingresa el código de 6 dígitos.');
            return;
        }
        setCargando(true);
        try {
            await authClienteService.verificarCorreo(form.correo, codigo);
            toast.exito('¡Correo verificado! Ya puedes iniciar sesión.');
            setCodigo('');
            setCargando(false);
            setTimeout(() => setModo('login'), 50);
        } catch (error) {
            mostrarError(error, 'Código incorrecto o expirado.');
            setCargando(false);
        }
    };

    // ---- RECUPERAR CONTRASEÑA (solicitar código) ----
    const solicitarRecuperacion = async (e) => {
        e.preventDefault();
        if (!form.correo) {
            toast.error('Ingresa tu correo.');
            return;
        }
        setCargando(true);
        try {
            await authClienteService.solicitarRecuperacion(form.correo);
            toast.exito('Si el correo existe, te enviamos un código.');
            setCargando(false);
            setTimeout(() => setModo('reset'), 50);
        } catch (error) {
            mostrarError(error, 'No se pudo procesar la solicitud.');
            setCargando(false);
        }
    };

    // ---- RESET CONTRASEÑA (con código) ----
    const hacerReset = async (e) => {
        e.preventDefault();
        if (!codigo || codigo.length < 6) {
            toast.error('Ingresa el código de 6 dígitos.');
            return;
        }
        if (!passwordValida(passwordNueva)) {
            toast.error('La nueva contraseña no cumple los requisitos.');
            return;
        }
        setCargando(true);
        try {
            await authClienteService.resetPassword(form.correo, codigo, passwordNueva);
            toast.exito('¡Contraseña restablecida! Inicia sesión.');
            setCodigo('');
            setPasswordNueva('');
            setCargando(false);
            setTimeout(() => setModo('login'), 50);
        } catch (error) {
            mostrarError(error, 'No se pudo restablecer la contraseña.');
            setCargando(false);
        }
    };

    const ReglaItem = ({ ok, texto }) => (
        <span className={`auth-cli-regla ${ok ? 'auth-cli-regla-ok' : ''}`}>
            {ok ? <Check size={13} /> : <X size={13} />} {texto}
        </span>
    );

    const reglas = reglasPassword(form.password);
    const reglasReset = reglasPassword(passwordNueva);

    return (
        <div className="auth-cli">
            <div className="auth-cli-marca">
                <button className="auth-cli-volver" onClick={() => navigate('/marketplace')}>
                    <ArrowLeft size={18} /> Volver al marketplace
                </button>
                <div className="auth-cli-marca-centro">
                    <div className="auth-cli-logo"><Store size={40} /></div>
                    <h1>ProdVen</h1>
                    <p>Compra en los mejores negocios locales, todo en un solo lugar.</p>
                </div>
                <div className="auth-cli-marca-deco"></div>
            </div>

            <div className="auth-cli-form-lado">
                <div className="auth-cli-form-caja">
                    {/* LOGIN */}
                    {modo === 'login' && (
                        <>
                            <h2>Iniciar sesión</h2>
                            <p className="auth-cli-sub">Ingresa a tu cuenta para comprar</p>
                            <form onSubmit={hacerLogin} className="auth-cli-form">
                                <div className="auth-cli-campo">
                                    <Mail size={18} />
                                    <input type="email" placeholder="Correo electrónico" value={form.correo} onChange={(e) => setCampo('correo', e.target.value)} />
                                </div>
                                <div className="auth-cli-campo">
                                    <Lock size={18} />
                                    <input type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setCampo('password', e.target.value)} />
                                </div>
                                <button type="button" className="auth-cli-olvido" onClick={() => setModo('recuperar')}>
                                    ¿Olvidaste tu contraseña?
                                </button>
                                <button type="submit" className="auth-cli-btn" disabled={cargando}>
                                    {cargando ? 'Ingresando...' : <>Iniciar sesión <ArrowRight size={18} /></>}
                                </button>
                            </form>
                            <p className="auth-cli-cambiar">
                                ¿No tienes cuenta? <button onClick={() => setModo('registro')}>Regístrate</button>
                            </p>
                        </>
                    )}

                    {/* REGISTRO */}
                    {modo === 'registro' && (
                        <>
                            <h2>Crear cuenta</h2>
                            <p className="auth-cli-sub">Únete para comprar en el marketplace</p>
                            <form onSubmit={hacerRegistro} className="auth-cli-form">
                                <div className="auth-cli-fila">
                                    <div className="auth-cli-campo">
                                        <User size={18} />
                                        <input type="text" placeholder="Nombres" value={form.nombres} onChange={(e) => setCampo('nombres', e.target.value)} />
                                    </div>
                                    <div className="auth-cli-campo">
                                        <User size={18} />
                                        <input type="text" placeholder="Apellidos" value={form.apellidos} onChange={(e) => setCampo('apellidos', e.target.value)} />
                                    </div>
                                </div>
                                <div className="auth-cli-campo">
                                    <Mail size={18} />
                                    <input type="email" placeholder="Correo electrónico" value={form.correo} onChange={(e) => setCampo('correo', e.target.value)} />
                                </div>
                                <div className="auth-cli-campo">
                                    <Phone size={18} />
                                    <input type="tel" placeholder="Teléfono (opcional)" value={form.telefono} onChange={(e) => setCampo('telefono', e.target.value)} />
                                </div>
                                <div className="auth-cli-campo">
                                    <Lock size={18} />
                                    <input type="password" placeholder="Contraseña" value={form.password} onChange={(e) => setCampo('password', e.target.value)} />
                                </div>
                                {form.password && (
                                    <div className="auth-cli-reglas">
                                        <ReglaItem ok={reglas.longitud} texto="8+ caracteres" />
                                        <ReglaItem ok={reglas.mayuscula} texto="Mayúscula" />
                                        <ReglaItem ok={reglas.minuscula} texto="Minúscula" />
                                        <ReglaItem ok={reglas.numero} texto="Número" />
                                        <ReglaItem ok={reglas.simbolo} texto="Símbolo" />
                                    </div>
                                )}
                                <button type="submit" className="auth-cli-btn" disabled={cargando}>
                                    {cargando ? 'Creando...' : <>Crear cuenta <ArrowRight size={18} /></>}
                                </button>
                            </form>
                            <p className="auth-cli-cambiar">
                                ¿Ya tienes cuenta? <button onClick={() => setModo('login')}>Inicia sesión</button>
                            </p>
                        </>
                    )}

                    {/* VERIFICAR */}
                    {modo === 'verificar' && (
                        <>
                            <div className="auth-cli-verif-icono"><ShieldCheck size={32} /></div>
                            <h2>Verifica tu correo</h2>
                            <p className="auth-cli-sub">Ingresa el código de 6 dígitos que enviamos a <strong>{form.correo || 'tu correo'}</strong></p>
                            <form onSubmit={hacerVerificacion} className="auth-cli-form">
                                <div className="auth-cli-campo auth-cli-campo-codigo">
                                    <input type="text" placeholder="••••••" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
                                </div>
                                <button type="submit" className="auth-cli-btn" disabled={cargando}>
                                    {cargando ? 'Verificando...' : 'Verificar'}
                                </button>
                            </form>
                            <p className="auth-cli-cambiar">
                                <button onClick={() => setModo('login')}>Volver al inicio de sesión</button>
                            </p>
                        </>
                    )}

                    {/* RECUPERAR (pedir correo) */}
                    {modo === 'recuperar' && (
                        <>
                            <div className="auth-cli-verif-icono"><KeyRound size={32} /></div>
                            <h2>Recuperar contraseña</h2>
                            <p className="auth-cli-sub">Ingresa tu correo y te enviaremos un código para restablecerla.</p>
                            <form onSubmit={solicitarRecuperacion} className="auth-cli-form">
                                <div className="auth-cli-campo">
                                    <Mail size={18} />
                                    <input type="email" placeholder="Correo electrónico" value={form.correo} onChange={(e) => setCampo('correo', e.target.value)} />
                                </div>
                                <button type="submit" className="auth-cli-btn" disabled={cargando}>
                                    {cargando ? 'Enviando...' : 'Enviar código'}
                                </button>
                            </form>
                            <p className="auth-cli-cambiar">
                                <button onClick={() => setModo('login')}>Volver al inicio de sesión</button>
                            </p>
                        </>
                    )}

                    {/* RESET (código + nueva contraseña) */}
                    {modo === 'reset' && (
                        <>
                            <div className="auth-cli-verif-icono"><KeyRound size={32} /></div>
                            <h2>Nueva contraseña</h2>
                            <p className="auth-cli-sub">Ingresa el código que recibiste y tu nueva contraseña.</p>
                            <form onSubmit={hacerReset} className="auth-cli-form">
                                <div className="auth-cli-campo auth-cli-campo-codigo">
                                    <input type="text" placeholder="••••••" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, '').slice(0, 6))} maxLength={6} />
                                </div>
                                <div className="auth-cli-campo">
                                    <Lock size={18} />
                                    <input type="password" placeholder="Nueva contraseña" value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} />
                                </div>
                                {passwordNueva && (
                                    <div className="auth-cli-reglas">
                                        <ReglaItem ok={reglasReset.longitud} texto="8+ caracteres" />
                                        <ReglaItem ok={reglasReset.mayuscula} texto="Mayúscula" />
                                        <ReglaItem ok={reglasReset.minuscula} texto="Minúscula" />
                                        <ReglaItem ok={reglasReset.numero} texto="Número" />
                                        <ReglaItem ok={reglasReset.simbolo} texto="Símbolo" />
                                    </div>
                                )}
                                <button type="submit" className="auth-cli-btn" disabled={cargando}>
                                    {cargando ? 'Restableciendo...' : 'Restablecer contraseña'}
                                </button>
                            </form>
                            <p className="auth-cli-cambiar">
                                <button onClick={() => setModo('login')}>Volver al inicio de sesión</button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AuthCliente;