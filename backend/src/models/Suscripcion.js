const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const Suscripcion = sequelize.define('Suscripcion', {
    idSuscripcion: {
        type: DataTypes.CHAR(36),
        field: 'id_suscripcion',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        unique: true,
        comment: 'Cada empresa tiene una sola suscripción activa a la vez'
    },
    plan: {
        type: DataTypes.ENUM('free', 'basico', 'premium', 'enterprise'),
        field: 'plan',
        allowNull: false,
        defaultValue: 'free'
    },
    estado: {
        type: DataTypes.ENUM('activa', 'vencida', 'suspendida', 'cancelada', 'periodo_gracia'),
        field: 'estado',
        allowNull: false,
        defaultValue: 'activa'
    },
    precioMensual: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'precio_mensual',
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Precio mensual en la moneda configurada'
    },
    moneda: {
        type: DataTypes.STRING(3),
        field: 'moneda',
        allowNull: false,
        defaultValue: 'COP'
    },
    ciclo: {
        type: DataTypes.ENUM('mensual', 'trimestral', 'semestral', 'anual'),
        field: 'ciclo',
        allowNull: false,
        defaultValue: 'mensual'
    },
    fechaInicio: {
        type: DataTypes.DATE,
        field: 'fecha_inicio',
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    fechaFin: {
        type: DataTypes.DATE,
        field: 'fecha_fin',
        allowNull: false
    },
    fechaProximoCobro: {
        type: DataTypes.DATE,
        field: 'fecha_proximo_cobro',
        allowNull: true
    },
    renovacionAutomatica: {
        type: DataTypes.BOOLEAN,
        field: 'renovacion_automatica',
        allowNull: false,
        defaultValue: true
    },
    limiteProductos: {
        type: DataTypes.INTEGER,
        field: 'limite_productos',
        allowNull: false,
        defaultValue: 20
    },
    limiteUsuarios: {
        type: DataTypes.INTEGER,
        field: 'limite_usuarios',
        allowNull: false,
        defaultValue: 2
    },
    limiteAlmacenamientoMb: {
        type: DataTypes.INTEGER,
        field: 'limite_almacenamiento_mb',
        allowNull: false,
        defaultValue: 100
    },
    limitePedidosMensuales: {
        type: DataTypes.INTEGER,
        field: 'limite_pedidos_mensuales',
        allowNull: false,
        defaultValue: 50
    },
    permiteMarketplace: {
        type: DataTypes.BOOLEAN,
        field: 'permite_marketplace',
        allowNull: false,
        defaultValue: false
    },
    permiteReportesAvanzados: {
        type: DataTypes.BOOLEAN,
        field: 'permite_reportes_avanzados',
        allowNull: false,
        defaultValue: false
    },
    permiteIntegracionesExternas: {
        type: DataTypes.BOOLEAN,
        field: 'permite_integraciones_externas',
        allowNull: false,
        defaultValue: false
    },
    permiteApiExterna: {
        type: DataTypes.BOOLEAN,
        field: 'permite_api_externa',
        allowNull: false,
        defaultValue: false
    },
    permiteMultiplesSucursales: {
        type: DataTypes.BOOLEAN,
        field: 'permite_multiples_sucursales',
        allowNull: false,
        defaultValue: false
    },
    permiteAppMovilDomiciliarios: {
        type: DataTypes.BOOLEAN,
        field: 'permite_app_movil_domiciliarios',
        allowNull: false,
        defaultValue: false
    },
    soportePrioritario: {
        type: DataTypes.BOOLEAN,
        field: 'soporte_prioritario',
        allowNull: false,
        defaultValue: false
    },
    diasPrueba: {
        type: DataTypes.INTEGER,
        field: 'dias_prueba',
        allowNull: false,
        defaultValue: 0
    },
    enPeriodoPrueba: {
        type: DataTypes.BOOLEAN,
        field: 'en_periodo_prueba',
        allowNull: false,
        defaultValue: false
    },
    fechaFinPrueba: {
        type: DataTypes.DATE,
        field: 'fecha_fin_prueba',
        allowNull: true
    },
    notasAdmin: {
        type: DataTypes.TEXT,
        field: 'notas_admin',
        allowNull: true,
        comment: 'Notas internas del SuperAdmin sobre esta suscripción'
    },
    canceladaPor: {
        type: DataTypes.CHAR(36),
        field: 'cancelada_por',
        allowNull: true
    },
    fechaCancelacion: {
        type: DataTypes.DATE,
        field: 'fecha_cancelacion',
        allowNull: true
    },
    motivoCancelacion: {
        type: DataTypes.TEXT,
        field: 'motivo_cancelacion',
        allowNull: true
    }
}, {
    tableName: 'suscripciones',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

/**
 * Verifica si la suscripción está activa y vigente
 */
Suscripcion.prototype.estaActiva = function() {
    if (this.estado !== 'activa' && this.estado !== 'periodo_gracia') {
        return false;
    }
    return new Date() < new Date(this.fechaFin);
};

/**
 * Verifica si está en período de prueba gratuita
 */
Suscripcion.prototype.estaEnPrueba = function() {
    if (!this.enPeriodoPrueba || !this.fechaFinPrueba) return false;
    return new Date() < new Date(this.fechaFinPrueba);
};

/**
 * Calcula los días restantes antes de que venza la suscripción
 */
Suscripcion.prototype.diasRestantes = function() {
    const ahora = new Date();
    const fin = new Date(this.fechaFin);
    const diferenciaMs = fin - ahora;

    if (diferenciaMs <= 0) return 0;

    return Math.ceil(diferenciaMs / (1000 * 60 * 60 * 24));
};

/**
 * Verifica si la suscripción está por vencer (menos de 7 días)
 */
Suscripcion.prototype.estaPorVencer = function() {
    const dias = this.diasRestantes();
    return dias > 0 && dias <= 7;
};

/**
 * Devuelve un resumen del plan para el frontend
 */
Suscripcion.prototype.resumenPlan = function() {
    return {
        plan: this.plan,
        estado: this.estado,
        diasRestantes: this.diasRestantes(),
        estaPorVencer: this.estaPorVencer(),
        estaEnPrueba: this.estaEnPrueba(),
        renovacionAutomatica: this.renovacionAutomatica,
        limites: {
            productos: this.limiteProductos,
            usuarios: this.limiteUsuarios,
            almacenamientoMb: this.limiteAlmacenamientoMb,
            pedidosMensuales: this.limitePedidosMensuales
        },
        funcionalidades: {
            marketplace: this.permiteMarketplace,
            reportesAvanzados: this.permiteReportesAvanzados,
            integracionesExternas: this.permiteIntegracionesExternas,
            apiExterna: this.permiteApiExterna,
            multiplesSucursales: this.permiteMultiplesSucursales,
            appMovilDomiciliarios: this.permiteAppMovilDomiciliarios,
            soportePrioritario: this.soportePrioritario
        }
    };
};

/**
 * Definición de los 4 planes disponibles con sus límites y funcionalidades
 * Esta es la fuente única de verdad para configurar planes
 */
Suscripcion.PLANES_DISPONIBLES = {
    free: {
        nombre: 'Free',
        precioMensual: 0,
        descripcion: 'Plan gratuito para empezar a probar ProdVen',
        limites: {
            productos: 20,
            usuarios: 2,
            almacenamientoMb: 100,
            pedidosMensuales: 50
        },
        funcionalidades: {
            permiteMarketplace: false,
            permiteReportesAvanzados: false,
            permiteIntegracionesExternas: false,
            permiteApiExterna: false,
            permiteMultiplesSucursales: false,
            permiteAppMovilDomiciliarios: false,
            soportePrioritario: false
        },
        diasPrueba: 30
    },

    basico: {
        nombre: 'Básico',
        precioMensual: 49000,
        descripcion: 'Para pequeños negocios que están creciendo',
        limites: {
            productos: 100,
            usuarios: 5,
            almacenamientoMb: 1024,
            pedidosMensuales: 500
        },
        funcionalidades: {
            permiteMarketplace: true,
            permiteReportesAvanzados: false,
            permiteIntegracionesExternas: false,
            permiteApiExterna: false,
            permiteMultiplesSucursales: false,
            permiteAppMovilDomiciliarios: true,
            soportePrioritario: false
        },
        diasPrueba: 14
    },

    premium: {
        nombre: 'Premium',
        precioMensual: 149000,
        descripcion: 'Para negocios establecidos que necesitan más poder',
        limites: {
            productos: 1000,
            usuarios: 20,
            almacenamientoMb: 10240,
            pedidosMensuales: 5000
        },
        funcionalidades: {
            permiteMarketplace: true,
            permiteReportesAvanzados: true,
            permiteIntegracionesExternas: true,
            permiteApiExterna: false,
            permiteMultiplesSucursales: true,
            permiteAppMovilDomiciliarios: true,
            soportePrioritario: true
        },
        diasPrueba: 14
    },

    enterprise: {
        nombre: 'Enterprise',
        precioMensual: 499000,
        descripcion: 'Solución completa para grandes empresas',
        limites: {
            productos: 999999,
            usuarios: 999,
            almacenamientoMb: 102400,
            pedidosMensuales: 999999
        },
        funcionalidades: {
            permiteMarketplace: true,
            permiteReportesAvanzados: true,
            permiteIntegracionesExternas: true,
            permiteApiExterna: true,
            permiteMultiplesSucursales: true,
            permiteAppMovilDomiciliarios: true,
            soportePrioritario: true
        },
        diasPrueba: 0
    }
};

/**
 * Devuelve la configuración de un plan específico
 * @param {string} nombrePlan - 'free', 'basico', 'premium' o 'enterprise'
 */
Suscripcion.obtenerConfiguracionPlan = function(nombrePlan) {
    return Suscripcion.PLANES_DISPONIBLES[nombrePlan] || null;
};

/**
 * Lista todos los planes disponibles para mostrar al cliente
 */
Suscripcion.listarPlanesPublicos = function() {
    return Object.entries(Suscripcion.PLANES_DISPONIBLES).map(([clave, plan]) => ({
        clave,
        ...plan
    }));
};

module.exports = Suscripcion;