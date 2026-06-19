import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './Layout.css';

/**
 * Estructura permanente del panel: menú lateral, barra superior
 * y área de contenido donde se renderiza cada página.
 */
function Layout({ children }) {
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <div className="layout">
            <Sidebar abierto={menuAbierto} />
            {menuAbierto && (
                <div className="layout-overlay" onClick={() => setMenuAbierto(false)}></div>
            )}
            <div className="layout-principal">
                <Topbar onToggleMenu={() => setMenuAbierto(!menuAbierto)} />
                <main className="layout-contenido">
                    {children}
                </main>
            </div>
        </div>
    );
}

export default Layout;