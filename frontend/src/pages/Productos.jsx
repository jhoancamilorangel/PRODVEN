import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import productoService from '../services/productoService';
import categoriaService from '../services/categoriaService';
import Modal from '../components/Modal';
import {
    Plus, Search, Pencil, Trash2, Star, Eye, EyeOff,
    Package, PackageX, Image as ImageIcon, Upload, X, Loader, Info
} from 'lucide-react';
import './Productos.css';

const FORM_VACIO = {
    nombre: '', codigoSku: '', descripcionCorta: '', descripcion: '',
    precioVenta: '', precioCosto: '', cantidadStock: '', stockMinimo: '',
    idCategoria: '', disponible: true, esFabricado: false
};

function Productos() {
    const { usuario } = useAuth();
    const toast = useToast();

    const [productos, setProductos] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [busqueda, setBusqueda] = useState('');

    const [modalAbierto, setModalAbierto] = useState(false);
    const [editandoId, setEditandoId] = useState(null);
    const [form, setForm] = useState(FORM_VACIO);
    const [guardando, setGuardando] = useState(false);
    // Stock actual del producto en edición (solo lectura, viene del inventario)
    const [stockActual, setStockActual] = useState(0);

    const [confirmarEliminar, setConfirmarEliminar] = useState(null);

    const [imagenes, setImagenes] = useState([]);
    const [cargandoImagenes, setCargandoImagenes] = useState(false);
    const [subiendoImagen, setSubiendoImagen] = useState(false);

    const idEmpresa = usuario?.idEmpresa;

    const cargarProductos = useCallback(async () => {
        if (!idEmpresa) return;
        try {
            setCargando(true);
            const params = busqueda ? { busqueda } : {};
            const res = await productoService.listar(idEmpresa, params);
            setProductos(res.data.data.productos || []);
        } catch {
            toast.error('No se pudieron cargar los productos.');
        } finally {
            setCargando(false);
        }
    }, [idEmpresa, busqueda, toast]);

    useEffect(() => {
        cargarProductos();
    }, [cargarProductos]);

    useEffect(() => {
        const cargarCategorias = async () => {
            if (!idEmpresa) return;
            try {
                const res = await categoriaService.listar(idEmpresa);
                setCategorias(res.data.data?.categorias || res.data.data || []);
            } catch {
                // Si falla, el selector queda vacío; no es bloqueante
            }
        };
        cargarCategorias();
    }, [idEmpresa]);

    const cargarImagenes = useCallback(async (idProducto) => {
        if (!idProducto) return;
        try {
            setCargandoImagenes(true);
            const res = await productoService.listarImagenes(idProducto);
            setImagenes(res.data.data?.imagenes || []);
        } catch {
            setImagenes([]);
        } finally {
            setCargandoImagenes(false);
        }
    }, []);

    const abrirCrear = () => {
        setEditandoId(null);
        setForm(FORM_VACIO);
        setImagenes([]);
        setStockActual(0);
        setModalAbierto(true);
    };

    const abrirEditar = (p) => {
        setEditandoId(p.idProducto);
        setForm({
            nombre: p.nombre || '',
            codigoSku: p.codigoSku || '',
            descripcionCorta: p.descripcionCorta || '',
            descripcion: p.descripcion || '',
            precioVenta: p.precioVenta || '',
            precioCosto: p.precioCosto || '',
            cantidadStock: p.cantidadStock || '',
            stockMinimo: p.stockMinimo || '',
            idCategoria: p.idCategoria || '',
            disponible: p.disponible ?? true,
            esFabricado: p.esFabricado ?? false
        });
        setStockActual(p.cantidadStock ?? 0);
        setImagenes([]);
        setModalAbierto(true);
        cargarImagenes(p.idProducto);
    };

    const cambiarCampo = (campo, valor) => {
        setForm((prev) => ({ ...prev, [campo]: valor }));
    };

    const guardar = async (e) => {
        e.preventDefault();
        if (!form.nombre || !form.precioVenta) {
            toast.error('El nombre y el precio de venta son obligatorios.');
            return;
        }

        setGuardando(true);
        try {
            const datos = {
                ...form,
                idEmpresa,
                precioVenta: parseFloat(form.precioVenta),
                precioCosto: form.precioCosto ? parseFloat(form.precioCosto) : 0,
                stockMinimo: form.stockMinimo ? parseInt(form.stockMinimo, 10) : 0,
                idCategoria: form.idCategoria || null
            };

            if (editandoId) {
                // Al editar NO mandamos cantidadStock: el stock se gestiona por inventario
                delete datos.cantidadStock;
                await productoService.actualizar(editandoId, datos);
                toast.exito('Producto actualizado correctamente.');
                setModalAbierto(false);
                cargarProductos();
            } else {
                // Al crear, el stock inicial sí se envía y se registra como entrada de inventario
                datos.cantidadStock = form.cantidadStock ? parseInt(form.cantidadStock, 10) : 0;
                const res = await productoService.crear(datos);
                const nuevo = res.data.data;
                toast.exito('Producto creado. Ahora puedes agregarle imágenes.');
                setEditandoId(nuevo.idProducto);
                setStockActual(nuevo.cantidadStock ?? 0);
                setImagenes([]);
                cargarProductos();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo guardar el producto.');
        } finally {
            setGuardando(false);
        }
    };

    const subirImagen = async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        if (!editandoId) {
            toast.error('Guarda el producto primero para agregarle imágenes.');
            return;
        }
        if (!archivo.type.startsWith('image/')) {
            toast.error('El archivo debe ser una imagen (JPG, PNG o WEBP).');
            return;
        }
        if (archivo.size > 5 * 1024 * 1024) {
            toast.error('La imagen no puede pesar más de 5MB.');
            return;
        }
        setSubiendoImagen(true);
        try {
            await productoService.subirImagen(editandoId, archivo);
            toast.exito('Imagen subida.');
            cargarImagenes(editandoId);
            cargarProductos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo subir la imagen.');
        } finally {
            setSubiendoImagen(false);
            e.target.value = '';
        }
    };

    const eliminarImagen = async (idImagen) => {
        if (!editandoId) return;
        try {
            await productoService.eliminarImagen(editandoId, idImagen);
            toast.exito('Imagen eliminada.');
            cargarImagenes(editandoId);
            cargarProductos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar la imagen.');
        }
    };

    const marcarPrincipal = async (idImagen) => {
        if (!editandoId) return;
        try {
            await productoService.marcarImagenPrincipal(editandoId, idImagen);
            toast.exito('Imagen principal actualizada.');
            cargarImagenes(editandoId);
            cargarProductos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo marcar la principal.');
        }
    };

    const eliminar = async () => {
        try {
            await productoService.eliminar(confirmarEliminar.idProducto);
            toast.exito('Producto eliminado.');
            setConfirmarEliminar(null);
            cargarProductos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo eliminar.');
        }
    };

    const toggleDestacado = async (p) => {
        try {
            await productoService.toggleDestacado(p.idProducto, !p.destacado);
            toast.exito(p.destacado ? 'Quitado de destacados.' : 'Producto destacado.');
            cargarProductos();
        } catch {
            toast.error('No se pudo cambiar el destacado.');
        }
    };

    const togglePublicar = async (p) => {
        try {
            await productoService.togglePublicacion(p.idProducto, !p.publicado);
            toast.exito(p.publicado ? 'Producto despublicado.' : 'Producto publicado en el marketplace.');
            cargarProductos();
        } catch (error) {
            toast.error(error.response?.data?.message || 'No se pudo cambiar la publicación.');
        }
    };

    const formatoMoneda = (v) =>
        new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v || 0);

    return (
        <div className="productos">
            <div className="prod-cabecera">
                <div>
                    <h1>Productos</h1>
                    <p>Gestiona el catálogo de tu negocio</p>
                </div>
                <button className="btn-primario" onClick={abrirCrear}>
                    <Plus size={18} /> Nuevo producto
                </button>
            </div>

            <div className="prod-barra">
                <div className="prod-buscador">
                    <Search size={18} className="prod-buscador-icono" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o SKU..."
                        value={busqueda}
                        onChange={(e) => setBusqueda(e.target.value)}
                    />
                </div>
            </div>

            {cargando ? (
                <div className="prod-cargando">
                    <div className="prod-spinner"></div>
                    <p>Cargando productos...</p>
                </div>
            ) : productos.length === 0 ? (
                <div className="prod-vacio">
                    <PackageX size={56} strokeWidth={1.3} />
                    <h3>No hay productos</h3>
                    <p>{busqueda ? 'No se encontraron resultados para tu búsqueda.' : 'Crea tu primer producto para empezar.'}</p>
                    {!busqueda && (
                        <button className="btn-primario" onClick={abrirCrear}>
                            <Plus size={18} /> Crear producto
                        </button>
                    )}
                </div>
            ) : (
                <div className="prod-tabla-contenedor">
                    <table className="prod-tabla">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>SKU</th>
                                <th>Precio</th>
                                <th>Stock</th>
                                <th>Estado</th>
                                <th className="prod-th-acciones">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {productos.map((p) => (
                                <tr key={p.idProducto}>
                                    <td>
                                        <div className="prod-nombre-celda">
                                            <div className="prod-mini-icono">
                                                {p.imagenPrincipal || p.imagenUrl ? (
                                                    <img src={p.imagenPrincipal || p.imagenUrl} alt={p.nombre} className="prod-mini-img" />
                                                ) : (
                                                    <Package size={18} />
                                                )}
                                            </div>
                                            <div>
                                                <span className="prod-nombre">{p.nombre}</span>
                                                {p.destacado && <span className="prod-badge-destacado"><Star size={11} /> Destacado</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="prod-sku">{p.codigoSku || '—'}</td>
                                    <td className="prod-precio">{formatoMoneda(p.precioVenta)}</td>
                                    <td>
                                        <span className={`prod-stock ${p.cantidadStock <= (p.stockMinimo || 0) ? 'prod-stock-bajo' : ''}`}>
                                            {p.cantidadStock ?? 0}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`prod-estado ${p.publicado ? 'estado-publicado' : 'estado-borrador'}`}>
                                            {p.publicado ? 'Publicado' : 'Borrador'}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="prod-acciones">
                                            <button className="prod-accion" title="Destacar" onClick={() => toggleDestacado(p)}>
                                                <Star size={16} className={p.destacado ? 'icono-activo-amarillo' : ''} />
                                            </button>
                                            <button className="prod-accion" title={p.publicado ? 'Despublicar' : 'Publicar'} onClick={() => togglePublicar(p)}>
                                                {p.publicado ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                            <button className="prod-accion" title="Editar" onClick={() => abrirEditar(p)}>
                                                <Pencil size={16} />
                                            </button>
                                            <button className="prod-accion prod-accion-peligro" title="Eliminar" onClick={() => setConfirmarEliminar(p)}>
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <Modal
                abierto={modalAbierto}
                onCerrar={() => setModalAbierto(false)}
                titulo={editandoId ? 'Editar producto' : 'Nuevo producto'}
                ancho="600px"
            >
                <form className="prod-form" onSubmit={guardar}>
                    <div className="prod-form-fila">
                        <div className="prod-form-campo prod-form-campo-ancho">
                            <label>Nombre *</label>
                            <input type="text" value={form.nombre} onChange={(e) => cambiarCampo('nombre', e.target.value)} placeholder="Ej: Camiseta Azul" />
                        </div>
                        <div className="prod-form-campo">
                            <label>SKU</label>
                            <input type="text" value={form.codigoSku} onChange={(e) => cambiarCampo('codigoSku', e.target.value)} placeholder="Ej: CAM-001" />
                        </div>
                    </div>

                    <div className="prod-form-campo">
                        <label>Descripción corta</label>
                        <input type="text" value={form.descripcionCorta} onChange={(e) => cambiarCampo('descripcionCorta', e.target.value)} placeholder="Una línea descriptiva" />
                    </div>

                    <div className="prod-form-campo">
                        <label>Descripción</label>
                        <textarea rows={3} value={form.descripcion} onChange={(e) => cambiarCampo('descripcion', e.target.value)} placeholder="Detalles del producto..." />
                    </div>

                    <div className="prod-form-fila">
                        <div className="prod-form-campo">
                            <label>Precio de venta *</label>
                            <input type="number" value={form.precioVenta} onChange={(e) => cambiarCampo('precioVenta', e.target.value)} placeholder="0" min="0" />
                        </div>
                        <div className="prod-form-campo">
                            <label>Precio de costo</label>
                            <input type="number" value={form.precioCosto} onChange={(e) => cambiarCampo('precioCosto', e.target.value)} placeholder="0" min="0" />
                        </div>
                    </div>

                    <div className="prod-form-fila">
                        {editandoId ? (
                            <div className="prod-form-campo">
                                <label>Stock actual</label>
                                <input type="number" value={stockActual} readOnly disabled className="prod-input-readonly" />
                                <span className="prod-campo-nota"><Info size={13} /> El stock se gestiona desde Inventario</span>
                            </div>
                        ) : (
                            <div className="prod-form-campo">
                                <label>Stock inicial</label>
                                <input type="number" value={form.cantidadStock} onChange={(e) => cambiarCampo('cantidadStock', e.target.value)} placeholder="0" min="0" />
                                <span className="prod-campo-nota"><Info size={13} /> Se registrará como entrada de inventario</span>
                            </div>
                        )}
                        <div className="prod-form-campo">
                            <label>Stock mínimo</label>
                            <input type="number" value={form.stockMinimo} onChange={(e) => cambiarCampo('stockMinimo', e.target.value)} placeholder="0" min="0" />
                        </div>
                    </div>

                    <div className="prod-form-campo">
                        <label>Categoría</label>
                        <select value={form.idCategoria} onChange={(e) => cambiarCampo('idCategoria', e.target.value)}>
                            <option value="">Sin categoría</option>
                            {categorias.map((c) => (
                                <option key={c.idCategoria} value={c.idCategoria}>{c.nombre}</option>
                            ))}
                        </select>
                    </div>
                    <div className="prod-form-campo">
                        <label className="prod-checkbox-label">
                            <input
                                type="checkbox"
                                checked={form.esFabricado}
                                onChange={(e) => cambiarCampo('esFabricado', e.target.checked)}
                            />
                            <span>Este producto se fabrica (tiene receta de producción)</span>
                        </label>
                    </div>

                    <div className="prod-imagenes-seccion">
                        <div className="prod-imagenes-cabecera">
                            <span className="prod-imagenes-titulo"><ImageIcon size={17} /> Imágenes del producto</span>
                            {editandoId && (
                                <label className={`prod-subir-btn ${subiendoImagen ? 'cargando' : ''}`}>
                                    {subiendoImagen ? <Loader size={15} className="prod-girando" /> : <Upload size={15} />}
                                    {subiendoImagen ? 'Subiendo...' : 'Subir imagen'}
                                    <input type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={subirImagen} disabled={subiendoImagen} hidden />
                                </label>
                            )}
                        </div>

                        {!editandoId ? (
                            <p className="prod-imagenes-aviso">
                                Guarda el producto primero (botón de abajo) y luego podrás agregarle imágenes.
                                Recuerda: un producto necesita al menos una imagen para publicarse en el marketplace.
                            </p>
                        ) : cargandoImagenes ? (
                            <p className="prod-imagenes-aviso">Cargando imágenes...</p>
                        ) : imagenes.length === 0 ? (
                            <p className="prod-imagenes-aviso">
                                Este producto aún no tiene imágenes. Sube al menos una para poder publicarlo.
                            </p>
                        ) : (
                            <div className="prod-imagenes-grid">
                                {imagenes.map((img) => (
                                    <div className={`prod-imagen-item ${img.esPrincipal ? 'principal' : ''}`} key={img.idImagen}>
                                        <img src={img.urlThumbnail || img.urlMedio || img.urlOriginal} alt={img.textoAlternativo || 'Producto'} />
                                        {img.esPrincipal && <span className="prod-imagen-principal-badge"><Star size={11} /> Principal</span>}
                                        <div className="prod-imagen-acciones">
                                            {!img.esPrincipal && (
                                                <button type="button" title="Marcar como principal" onClick={() => marcarPrincipal(img.idImagen)}>
                                                    <Star size={14} />
                                                </button>
                                            )}
                                            <button type="button" className="prod-imagen-eliminar" title="Eliminar" onClick={() => eliminarImagen(img.idImagen)}>
                                                <X size={14} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="prod-form-acciones">
                        <button type="button" className="btn-secundario" onClick={() => setModalAbierto(false)}>
                            {editandoId ? 'Cerrar' : 'Cancelar'}
                        </button>
                        <button type="submit" className="btn-primario" disabled={guardando}>
                            {guardando ? 'Guardando...' : (editandoId ? 'Guardar cambios' : 'Crear producto')}
                        </button>
                    </div>
                </form>
            </Modal>

            <Modal
                abierto={!!confirmarEliminar}
                onCerrar={() => setConfirmarEliminar(null)}
                titulo="Eliminar producto"
                ancho="420px"
            >
                <p className="prod-confirmar-texto">
                    ¿Seguro que deseas eliminar <strong>{confirmarEliminar?.nombre}</strong>? Esta acción no se puede deshacer.
                </p>
                <div className="prod-form-acciones">
                    <button className="btn-secundario" onClick={() => setConfirmarEliminar(null)}>Cancelar</button>
                    <button className="btn-peligro" onClick={eliminar}>Sí, eliminar</button>
                </div>
            </Modal>
        </div>
    );
}

export default Productos;