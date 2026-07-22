import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../context/ToastContext';
import authClienteService from '../services/authClienteService';
import MarketplaceHeader from '../components/marketplace/MarketplaceHeader';
import MarketplaceFooter from '../components/marketplace/MarketplaceFooter';
import {
    ArrowLeft, User, Mail, Phone, Shield, LogOut, Check,
    Eye, EyeOff, Loader2, BadgeCheck
} from 'lucide-react';
import './MiPerfil.css';

function MiPerfil() {
    const navigate = useNavigate();
    const toast = useToast();

    const [cargando, setCargando] = useState(true);
    const [perfil, setPerfil] = useState(null);

    // Datos personales
    const [form, setForm] = useState({ nombres: '', apellidos: '', telefono: '' });
    const [guardando, setGuardando] = useState(false);

    // Contraseña
    const [pass, setPass] = useState({ actual: '', nueva: '', confirmar: '' });
    const [verPass, setVerPass] = useState({ actual: false, nueva: false, confirmar: false });
    const [cambiandoPass, setCambiandoPass] = useState(false);

    const estaLogueado = () => !!sessionStorage.getItem('prodven_cli_token');

    const cargar = useCallback(async () => {
        if (!estaLogueado()) {
            toast.info('Inicia sesión para ver tu perfil.');
            setTimeout(() => navigate('/cuenta'), 600);
            return;
        }
        try {
            setCargando(true);
            const res = await authClienteService.obtenerPerfil();
            const datos = res.data.data?.usuario || res.data.data || {};
            setPerfil(datos);
            setForm({
                nombres: datos.nombres || '',
                apellidos: datos.apellidos || '',
                telefono: datos.telefono || ''
            });
        } catch {
            toast.error('No se pudo cargar tu perfil.');
        } finally {
            setCargando(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => { cargar(); }, [cargar]);

    const iniciales = perfil
        ? ((perfil.nombres?.[0] || '') + (perfil.apellidos?.[0] || '')).toUpperCase()
        : 'U';

    const hayCambios =
        perfil && (
            form.nombres !== (perfil.nombres || '') ||
            form.apellidos !== (perfil.apellidos || '') ||
            form.telefono !== (perfil.telefono || '')
        );

    const guardarDatos = async () => {
        if (!form.nombres.trim() || !form.apellidos.trim()) {
            toast.error('Nombres y apellidos son obligatorios.');
            return;
        }
        setGuardando(true);
        try {
            await authClienteService.actualizarPerfil({
                nombres: form.nombres.trim(),
                apellidos: form.apellidos.trim(),
                telefono: form.telefono.trim() || null
            });
            toast.exito('Perfil actualizado.');
            // Actualizar el usuario guardado para que el header muestre el nombre nuevo
            const raw = sessionStorage.getItem('prodven_cli_usuario');
            if (raw) {
                try {
                    const u = JSON.parse(raw);
                    u.nombres = form.nombres.trim();
                    u.apellidos = form.apellidos.trim();
                    sessionStorage.setItem('prodven_cli_usuario', JSON.stringify(u));
                } catch { /* nada */ }
            }
            setPerfil({ ...perfil, ...form });
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo actualizar el perfil.');
        } finally {
            setGuardando(false);
        }
    };

    const cambiarPassword = async () => {
        if (!pass.actual || !pass.nueva || !pass.confirmar) {
            toast.error('Completa todos los campos de contraseña.');
            return;
        }
        if (pass.nueva.length < 8) {
            toast.error('La nueva contraseña debe tener al menos 8 caracteres.');
            return;
        }
        if (pass.nueva !== pass.confirmar) {
            toast.error('La confirmación no coincide con la nueva contraseña.');
            return;
        }
        setCambiandoPass(true);
        try {
            await authClienteService.cambiarPassword(pass.actual, pass.nueva);
            toast.exito('Contraseña cambiada correctamente.');
            setPass({ actual: '', nueva: '', confirmar: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cambiar la contraseña.');
        } finally {
            setCambiandoPass(false);
        }
    };

    const cerrarSesion = async () => {
    const refreshToken = sessionStorage.getItem('prodven_cli_refresh');

    try {
        await authClienteService.logout(refreshToken);
    } catch (error) {
        console.error('Error al cerrar sesión en el servidor:', error);
    }

    sessionStorage.removeItem('prodven_cli_token');
    sessionStorage.removeItem('prodven_cli_refresh');
    sessionStorage.removeItem('prodven_cli_usuario');
    navigate('/marketplace');
    setTimeout(() => window.location.reload(), 50);
};

    // Medidor de fuerza de la nueva contraseña
    const fuerzaPass = () => {
        const p = pass.nueva;
        if (!p) return { nivel: 0, texto: '', clase: '' };
        let n = 0;
        if (p.length >= 8) n++;
        if (/[A-Z]/.test(p) && /[a-z]/.test(p)) n++;
        if (/\d/.test(p)) n++;
        if (/[^A-Za-z0-9]/.test(p)) n++;
        const mapa = [
            { texto: '', clase: '' },
            { texto: 'Débil', clase: 'perf-fuerza-1' },
            { texto: 'Aceptable', clase: 'perf-fuerza-2' },
            { texto: 'Buena', clase: 'perf-fuerza-3' },
            { texto: 'Fuerte', clase: 'perf-fuerza-4' }
        ];
        return { nivel: n, ...mapa[n] };
    };
    const fuerza = fuerzaPass();

    if (cargando) {
        return (
            <div className="perf">
                <MarketplaceHeader />
                <div className="perf-cargando"><div className="perf-spinner"></div><p>Cargando tu perfil...</p></div>
            </div>
        );
    }

    return (
        <div className="perf">
            <MarketplaceHeader />

            <main className="perf-main">
                <button className="perf-volver" onClick={() => navigate('/marketplace')}>
                    <ArrowLeft size={18} /> Volver al marketplace
                </button>

                {/* Tarjeta de identidad */}
                <div className="perf-hero">
                    <div className="perf-hero-fondo"></div>
                    <div className="perf-hero-contenido">
                        <div className="perf-avatar">
                            {perfil?.avatarUrl
                                ? <img src={perfil.avatarUrl} alt="avatar" />
                                : <span>{iniciales}</span>}
                        </div>
                        <div className="perf-hero-datos">
                            <h1>{perfil?.nombres} {perfil?.apellidos}</h1>
                            <div className="perf-hero-correo">
                                <Mail size={14} /> {perfil?.correo}
                                {perfil?.verificado && (
                                    <span className="perf-verificado" title="Cuenta verificada">
                                        <BadgeCheck size={15} /> Verificada
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="perf-columnas">
                    {/* Datos personales */}
                    <section className="perf-card">
                        <div className="perf-card-cab">
                            <div className="perf-card-icono perf-icono-azul"><User size={18} /></div>
                            <div>
                                <h2>Datos personales</h2>
                                <p>Tu información básica de contacto</p>
                            </div>
                        </div>

                        <div className="perf-campos">
                            <div className="perf-fila">
                                <div className="perf-campo">
                                    <label>Nombres</label>
                                    <input type="text" value={form.nombres}
                                        onChange={(e) => setForm({ ...form, nombres: e.target.value })} />
                                </div>
                                <div className="perf-campo">
                                    <label>Apellidos</label>
                                    <input type="text" value={form.apellidos}
                                        onChange={(e) => setForm({ ...form, apellidos: e.target.value })} />
                                </div>
                            </div>
                            <div className="perf-campo">
                                <label><Phone size={13} /> Teléfono</label>
                                <input type="tel" value={form.telefono}
                                    onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                                    placeholder="Tu número de contacto" />
                            </div>
                            <div className="perf-campo">
                                <label><Mail size={13} /> Correo electrónico</label>
                                <input type="email" value={perfil?.correo || ''} disabled className="perf-input-bloqueado" />
                                <span className="perf-ayuda">El correo no se puede cambiar por seguridad.</span>
                            </div>
                        </div>

                        <button className="perf-btn-guardar" onClick={guardarDatos} disabled={guardando || !hayCambios}>
                            {guardando
                                ? (<><Loader2 size={17} className="perf-girando" /> Guardando...</>)
                                : (<><Check size={17} /> Guardar cambios</>)}
                        </button>
                    </section>

                    {/* Seguridad */}
                    <section className="perf-card">
                        <div className="perf-card-cab">
                            <div className="perf-card-icono perf-icono-verde"><Shield size={18} /></div>
                            <div>
                                <h2>Seguridad</h2>
                                <p>Cambia tu contraseña</p>
                            </div>
                        </div>

                        <div className="perf-campos">
                            {[
                                { key: 'actual', label: 'Contraseña actual' },
                                { key: 'nueva', label: 'Nueva contraseña' },
                                { key: 'confirmar', label: 'Confirmar nueva contraseña' }
                            ].map((c) => (
                                <div className="perf-campo" key={c.key}>
                                    <label>{c.label}</label>
                                    <div className="perf-input-pass">
                                        <input
                                            type={verPass[c.key] ? 'text' : 'password'}
                                            value={pass[c.key]}
                                            onChange={(e) => setPass({ ...pass, [c.key]: e.target.value })}
                                            placeholder="••••••••"
                                        />
                                        <button type="button" onClick={() => setVerPass({ ...verPass, [c.key]: !verPass[c.key] })}>
                                            {verPass[c.key] ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                    {c.key === 'nueva' && pass.nueva && (
                                        <div className="perf-fuerza">
                                            <div className="perf-fuerza-barras">
                                                {[1, 2, 3, 4].map((i) => (
                                                    <span key={i} className={`perf-fuerza-barra ${i <= fuerza.nivel ? fuerza.clase : ''}`}></span>
                                                ))}
                                            </div>
                                            <span className={`perf-fuerza-texto ${fuerza.clase}`}>{fuerza.texto}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <button className="perf-btn-pass" onClick={cambiarPassword} disabled={cambiandoPass}>
                            {cambiandoPass
                                ? (<><Loader2 size={17} className="perf-girando" /> Cambiando...</>)
                                : (<><Shield size={17} /> Cambiar contraseña</>)}
                        </button>
                    </section>
                </div>

                {/* Cerrar sesión */}
                <button className="perf-salir" onClick={cerrarSesion}>
                    <LogOut size={18} /> Cerrar sesión
                </button>
            </main>

            <MarketplaceFooter />
        </div>
    );
}

export default MiPerfil;