const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Empresa = sequelize.define('Empresa', {
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    nombre: {
        type: DataTypes.STRING(150),
        field: 'nombre',
        allowNull: false,
        validate: {
            notEmpty: { msg: 'El nombre de la empresa no puede estar vacío' },
            len: { args: [2, 150], msg: 'El nombre debe tener entre 2 y 150 caracteres' }
        }
    },
    razonSocial: {
        type: DataTypes.STRING(200),
        field: 'razon_social',
        allowNull: true
    },
    nit: {
        type: DataTypes.STRING(50),
        field: 'nit',
        allowNull: true,
        unique: true
    },
    tipoDocumento: {
        type: DataTypes.ENUM('NIT', 'RUT', 'CIF', 'RFC', 'CUIT', 'OTRO'),
        field: 'tipo_documento',
        allowNull: true,
        defaultValue: 'NIT'
    },
    correo: {
        type: DataTypes.STRING(150),
        field: 'correo',
        allowNull: false,
        validate: {
            isEmail: { msg: 'El correo no tiene un formato válido' }
        }
    },
    telefono: {
        type: DataTypes.STRING(20),
        field: 'telefono',
        allowNull: true
    },
    telefonoSecundario: {
        type: DataTypes.STRING(20),
        field: 'telefono_secundario',
        allowNull: true
    },
    direccion: {
        type: DataTypes.STRING(255),
        field: 'direccion',
        allowNull: true
    },
    ciudad: {
        type: DataTypes.STRING(100),
        field: 'ciudad',
        allowNull: true
    },
    departamento: {
        type: DataTypes.STRING(100),
        field: 'departamento',
        allowNull: true
    },
    pais: {
        type: DataTypes.STRING(100),
        field: 'pais',
        allowNull: false,
        defaultValue: 'Colombia'
    },
    codigoPostal: {
        type: DataTypes.STRING(20),
        field: 'codigo_postal',
        allowNull: true
    },
    descripcion: {
        type: DataTypes.TEXT,
        field: 'descripcion',
        allowNull: true
    },
    descripcionCorta: {
        type: DataTypes.STRING(255),
        field: 'descripcion_corta',
        allowNull: true
    },
    categoria: {
        type: DataTypes.STRING(100),
        field: 'categoria',
        allowNull: true
    },
    logoUrl: {
        type: DataTypes.TEXT,
        field: 'logo_url',
        allowNull: true
    },
    logoPublicId: {
        type: DataTypes.STRING(255),
        field: 'logo_public_id',
        allowNull: true
    },
    portadaUrl: {
        type: DataTypes.TEXT,
        field: 'portada_url',
        allowNull: true
    },
    portadaPublicId: {
        type: DataTypes.STRING(255),
        field: 'portada_public_id',
        allowNull: true
    },
    sitioWeb: {
        type: DataTypes.STRING(255),
        field: 'sitio_web',
        allowNull: true,
        validate: {
            isUrl: { msg: 'El sitio web debe ser una URL válida' }
        }
    },
    redesSociales: {
        type: DataTypes.JSON,
        field: 'redes_sociales',
        allowNull: true,
        defaultValue: {},
        comment: 'Objeto JSON con redes sociales: facebook, instagram, twitter, tiktok, whatsapp, linkedin, youtube'
    },
    horarioAtencion: {
        type: DataTypes.JSON,
        field: 'horario_atencion',
        allowNull: true,
        defaultValue: {},
        comment: 'Objeto JSON con horarios por día de la semana'
    },
    modoPublico: {
        type: DataTypes.BOOLEAN,
        field: 'modo_publico',
        allowNull: false,
        defaultValue: false,
        comment: 'Si está activo, la empresa aparece en el marketplace público'
    },
    aceptaDomicilios: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_domicilios',
        allowNull: false,
        defaultValue: true
    },
    aceptaRecogerEnTienda: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_recoger_en_tienda',
        allowNull: false,
        defaultValue: true
    },
    calificacionPromedio: {
        type: DataTypes.DECIMAL(3, 2),
        field: 'calificacion_promedio',
        allowNull: false,
        defaultValue: 0.00
    },
    totalResenas: {
        type: DataTypes.INTEGER,
        field: 'total_resenas',
        allowNull: false,
        defaultValue: 0
    },
    estado: {
        type: DataTypes.ENUM('activa', 'inactiva', 'suspendida', 'pendiente_verificacion'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'pendiente_verificacion'
    },
    fechaVerificacion: {
        type: DataTypes.DATE,
        field: 'fecha_verificacion',
        allowNull: true
    },
    activo: {
        type: DataTypes.BOOLEAN,
        field: 'activo',
        defaultValue: true
    },
    eliminado: {
        type: DataTypes.BOOLEAN,
        field: 'eliminado',
        defaultValue: false
    }
}, {
    tableName: 'empresas',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

/**
 * Verifica si la empresa está operativa
 * (activa, no eliminada, no suspendida)
 */
Empresa.prototype.estaOperativa = function() {
    return this.activo === true 
        && this.eliminado === false 
        && this.estado === 'activa';
};

/**
 * Verifica si la empresa está visible en el marketplace público
 */
Empresa.prototype.esVisiblePublicamente = function() {
    return this.estaOperativa() && this.modoPublico === true;
};

/**
 * Devuelve los datos públicos de la empresa para el marketplace
 * Excluye información administrativa o sensible
 */
Empresa.prototype.datosPublicos = function() {
    return {
        idEmpresa: this.idEmpresa,
        nombre: this.nombre,
        descripcion: this.descripcion,
        descripcionCorta: this.descripcionCorta,
        categoria: this.categoria,
        logoUrl: this.logoUrl,
        portadaUrl: this.portadaUrl,
        ciudad: this.ciudad,
        departamento: this.departamento,
        pais: this.pais,
        sitioWeb: this.sitioWeb,
        redesSociales: this.redesSociales,
        horarioAtencion: this.horarioAtencion,
        aceptaDomicilios: this.aceptaDomicilios,
        aceptaRecogerEnTienda: this.aceptaRecogerEnTienda,
        calificacionPromedio: this.calificacionPromedio,
        totalResenas: this.totalResenas
    };
};

module.exports = Empresa;