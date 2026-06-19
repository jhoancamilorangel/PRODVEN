import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Login.css';

function Login() {
    const [correo, setCorreo] = useState('');
    const [contrasena, setContrasena] = useState('');
    const [error, setError] = useState('');
    const [enviando, setEnviando] = useState(false);
    const [verContrasena, setVerContrasena] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const manejarEnvio = async (evento) => {
        evento.preventDefault();
        setError('');

        if (!correo || !contrasena) {
            setError('Por favor completa todos los campos.');
            return;
        }

        setEnviando(true);
        const resultado = await login(correo, contrasena);
        setEnviando(false);

        if (resultado.exito) {
            navigate('/dashboard');
        } else {
            setError(resultado.mensaje);
        }
    };

    return (
        <div className="login">
            {/* Panel izquierdo: marca */}
            <div className="login-marca-panel">
                <div className="login-marca-contenido">
                    <h1 className="login-marca-logo">ProdVen</h1>
                    <p className="login-marca-lema">
                        Gestión de inventarios, ventas y producción en un solo lugar
                    </p>
                    <div className="login-marca-puntos">
                        <span></span><span></span><span></span>
                    </div>
                </div>
                <div className="login-marca-deco login-marca-deco-1"></div>
                <div className="login-marca-deco login-marca-deco-2"></div>
            </div>

            {/* Panel derecho: formulario */}
            <div className="login-form-panel">
                <div className="login-tarjeta">
                    <header className="login-tarjeta-cabecera">
                        <h2>Bienvenido de nuevo</h2>
                        <p>Ingresa tus credenciales para acceder al panel</p>
                    </header>

                    <form className="login-formulario" onSubmit={manejarEnvio}>
                        <div className="login-campo">
                            <label htmlFor="correo">Correo electrónico</label>
                            <input
                                id="correo"
                                type="email"
                                value={correo}
                                onChange={(e) => setCorreo(e.target.value)}
                                placeholder="tucorreo@ejemplo.com"
                                autoComplete="email"
                            />
                        </div>

                        <div className="login-campo">
                            <label htmlFor="contrasena">Contraseña</label>
                            <div className="login-campo-password">
                                <input
                                    id="contrasena"
                                    type={verContrasena ? 'text' : 'password'}
                                    value={contrasena}
                                    onChange={(e) => setContrasena(e.target.value)}
                                    placeholder="Tu contraseña"
                                    autoComplete="current-password"
                                />
                                <button
                                    type="button"
                                    className="login-toggle-password"
                                    onClick={() => setVerContrasena(!verContrasena)}
                                    aria-label={verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                >
                                    {verContrasena ? 'Ocultar' : 'Ver'}
                                </button>
                            </div>
                        </div>

                        {error && <div className="login-error">{error}</div>}

                        <button type="submit" className="login-boton" disabled={enviando}>
                            {enviando ? 'Ingresando...' : 'Iniciar sesión'}
                        </button>
                    </form>

                    <footer className="login-tarjeta-pie">
                        © 2026 ProdVen. Todos los derechos reservados.
                    </footer>
                </div>
            </div>
        </div>
    );
}

export default Login;