import { Store, Heart } from 'lucide-react';
import './MarketplaceFooter.css';

function MarketplaceFooter() {
    return (
        <footer className="mkt-footer">
            <div className="mkt-footer-contenido">
                <div className="mkt-footer-marca">
                    <div className="mkt-footer-logo">
                        <Store size={20} />
                        <span>ProdVen</span>
                    </div>
                    <p>La plataforma donde los negocios y sus clientes se encuentran.</p>
                </div>
                <div className="mkt-footer-cols">
                    <div className="mkt-footer-col">
                        <h4>Marketplace</h4>
                        <a href="/marketplace">Explorar tiendas</a>
                        <a href="/marketplace">Productos</a>
                    </div>
                    <div className="mkt-footer-col">
                        <h4>Para negocios</h4>
                        <a href="/login">Vender en ProdVen</a>
                        <a href="/login">Ingresar</a>
                    </div>
                    <div className="mkt-footer-col">
                        <h4>Ayuda</h4>
                        <a href="/marketplace">Cómo comprar</a>
                        <a href="/marketplace">Contacto</a>
                    </div>
                </div>
            </div>
            <div className="mkt-footer-base">
                <span>© 2026 ProdVen. Todos los derechos reservados.</span>
                <span className="mkt-footer-hecho">Hecho con <Heart size={13} fill="currentColor" /> en Colombia</span>
            </div>
        </footer>
    );
}

export default MarketplaceFooter;