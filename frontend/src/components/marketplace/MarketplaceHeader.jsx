import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Search, ShoppingCart, User, Menu } from 'lucide-react';
import './MarketplaceHeader.css';

function MarketplaceHeader({ busqueda, onBuscar }) {
    const navigate = useNavigate();
    const [texto, setTexto] = useState(busqueda || '');

    const buscar = (e) => {
        e.preventDefault();
        if (onBuscar) onBuscar(texto);
    };

    return (
        <header className="mkt-header">
            <div className="mkt-header-contenido">
                <button className="mkt-logo" onClick={() => navigate('/marketplace')}>
                    <div className="mkt-logo-icono"><Store size={22} /></div>
                    <span className="mkt-logo-texto">ProdVen</span>
                </button>

                <form className="mkt-buscador" onSubmit={buscar}>
                    <Search size={19} className="mkt-buscador-icono" />
                    <input
                        type="text"
                        placeholder="Busca tiendas o productos..."
                        value={texto}
                        onChange={(e) => setTexto(e.target.value)}
                    />
                    <button type="submit" className="mkt-buscador-btn">Buscar</button>
                </form>

                <div className="mkt-header-acciones">
                    <button className="mkt-header-btn" onClick={() => navigate('/carrito')}>
                        <ShoppingCart size={20} />
                        <span className="mkt-header-btn-texto">Carrito</span>
                    </button>
                    <button className="mkt-header-btn" onClick={() => navigate('/cuenta')}>
                        <User size={20} />
                        <span className="mkt-header-btn-texto">Cuenta</span>
                    </button>
                </div>
            </div>
        </header>
    );
}

export default MarketplaceHeader;