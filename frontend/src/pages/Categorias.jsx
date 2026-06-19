import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import categoriaService from '../services/categoriaService';
import Modal from '../components/Modal';
import { Plus, Pencil, Trash2, Tags, FolderOpen } from 'lucide-react';
import './Categorias.css';

const FORM_VACIO = { nombre: '', descripcion: '', ordenVisualizacion: '' };

function Categorias() {
    const { usuario } = useAuth();
    const toast = useToast();

    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    const [confirmarEliminar, setConfirmarEliminar] = useState(null);

    const idEmpresa = usuario?.idEmpresa;

    const cargar = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const res = await categoriaService.listar(idEmpresa);
            setCategorias(res.data.data?.categorias || []);
        } catch {
            toast.error('No se pudieron cargar las categorías.');
        } finally {
            setCargando(false);
        }
    }, [idEmpresa, toast]);

    useEffect(() => { cargar(); }, [cargar]);

    const abrirCrear = () => {
        setEditandoId(null);
        setForm(FORM_VACIO);
        setModalAbierto(true);
    };

    const abrirEditar = (c) => {
        setEditandoId(c.idCategoria);
        setForm({
            nombre: c.nombre || '',
            descripcion: c.descripcion || '',
            ordenVisualizacion: c.ordenVisualizacion ?? ''
        });
        setModalAbierto(true);
    };

    const cambiarCampo = (campo, valor) => setForm((p) => ({ ...p, [campo]: valor }));

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre) {
            toast.error('El nombre es obligatorio.');
            return;
        }
        setGuardando(true);
        try {
            const datos = {
                ...form,
                idEmpresa,
                ordenVisualizacion: form.ordenVisualizacion ? parseInt(form.ordenVisualizacion, 10) : 0
            };
            if (editandoId) {
                await categoriaService.actualizar(editandoId, datos);
                toast.exito('Categoría actualizada.');
            } else {
                await categoriaService.crear(datos);
                toast.exito('Categoría creada.');
            }
            setModalAbierto(false);
            cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo guardar.');
        } finally {
            setGuardando(false);
        }
    };

    const eliminar = async () => {
        try {
            await categoriaService.eliminar(confirmarEliminar.idCategoria);
            toast.exito('Categoría eliminada.');
            setConfirmarEliminar(null);
            cargar();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar.');
        }
    };

    return (
        <div className="categorias">
            <div className="cat-cabecera">
                <div>
                    <h1>Categorías</h1>
                    <p>Organiza tus productos por categorías</p>
                </div>
                <button className="btn-primario" onClick={abrirCrear}>
                    <Plus size={18} /> Nueva categoría
                </button>
            </div>

            {cargando ? (
                <div className="cat-cargando"><div className="cat-spinner"></div><p>Cargando...</p></div>
            ) : categorias.length === 0 ? (
                <div className="cat-vacio">
                    <FolderOpen size={56} strokeWidth={1.3} />
                    <h3>No hay categorías</h3>
                    <p>Crea tu primera categoría para organizar tus productos.</p>
                    <button className="btn-primario" onClick={abrirCrear}><Plus size={18} /> Crear categoría</button>
                </div>
            ) : (
                <div className="cat-grid">
                    {categorias.map((c) => (
                        <div className="cat-tarjeta" key={c.idCategoria}>
                            <div className="cat-tarjeta-icono"><Tags size={22} /></div>
                            <div className="cat-tarjeta-info">
                                <h3>{c.nombre}</h3>
                                <p>{c.descripcion || 'Sin descripción'}</p>
                                <span className="cat-tarjeta-contador">{c.totalProductos || 0} productos</span>
                            </div>
                            <div className="cat-tarjeta-acciones">
                                <button className="cat-accion" title="Editar" onClick={() => abrirEditar(c)}>
                                    <Pencil size={16} />
                                </button>
                                <button className="cat-accion cat-accion-peligro" title="Eliminar" onClick={() => setConfirmarEliminar(c)}>
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal abierto={modalAbierto} onCerrar={() => setModalAbierto(false)} titulo={editandoId ? 'Editar categoría' : 'Nueva categoría'} ancho="480px">
                <form className="cat-form" onSubmit={guardar}>
                    <div className="cat-form-campo">
                        <label>Nombre *</label>
                        <input type="text" value={form.nombre} onChange={(e) => cambiarCampo('nombre', e.target.value)} placeholder="Ej: Bebidas" />
                    </div>
                    <div className="cat-form-campo">
                        <label>Descripción</label>
                        <textarea rows={3} value={form.descripcion} onChange={(e) => cambiarCampo('descripcion', e.target.value)} placeholder="Descripción de la categoría..." />
                    </div>
                    <div className="cat-form-campo">
                        <label>Orden de visualización</label>
                        <input type="number" value={form.ordenVisualizacion} onChange={(e) => cambiarCampo('ordenVisualizacion', e.target.value)} placeholder="0" min="0" />
                    </div>
                    <div className="cat-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalAbierto(false)}>Cancelar</button>
                        <button type="submit" className="btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : (editandoId ? 'Guardar cambios' : 'Crear categoría')}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal abierto={!!confirmarEliminar} onCerrar={() => setConfirmarEliminar(null)} titulo="Eliminar categoría" ancho="420px">
                <p className="cat-confirmar-texto">
                    ¿Seguro que deseas eliminar <strong>{confirmarEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="cat-form-acciones">
                    <button className="btn-secundario" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
                    <button className="btn-peligro" onClick={eliminar}>Sí, eliminar</button>
                </div>
            </Modal>
        </div>
    );
}

export default Categorias;