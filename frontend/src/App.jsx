import './App.css';

/**
 * Componente raíz de la aplicación ProdVen.
 * Por ahora muestra una pantalla de bienvenida de prueba.
 * Más adelante aquí irá el enrutamiento (login, dashboard, etc.).
 */
function App() {
    return (
        <div className="bienvenida">
            <div className="bienvenida-tarjeta">
                <h1 className="bienvenida-titulo">ProdVen</h1>
                <p className="bienvenida-subtitulo">Panel Administrativo</p>
                <div className="bienvenida-linea"></div>
                <p className="bienvenida-texto">
                    Frontend en construcción. Cimientos listos.
                </p>
            </div>
        </div>
    );
}

export default App;