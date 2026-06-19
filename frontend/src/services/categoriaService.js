import api from './api';

/**
 * Servicio de Categorías.
 */
const categoriaService = {
    listar: (idEmpresa) =>
        api.get('/categorias', { params: { idEmpresa } }),

    crear: (datos) =>
        api.post('/categorias', datos),

    actualizar: (id, datos) =>
        api.put(`/categorias/${id}`, datos),

    eliminar: (id) =>
        api.delete(`/categorias/${id}`)
};

export default categoriaService;