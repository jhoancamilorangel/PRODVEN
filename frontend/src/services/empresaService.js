import api from './api';

/**
 * Servicio de Empresa: datos propios y activación del marketplace.
 */
const empresaService = {
    obtenerMiEmpresa: () =>
        api.get('/empresas/mi-empresa'),

    toggleMarketplace: (modoPublico) =>
        api.patch('/empresas/mi-empresa/marketplace', { modoPublico })
};

export default empresaService;