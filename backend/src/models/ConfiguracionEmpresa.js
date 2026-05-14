const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const ConfiguracionEmpresa = sequelize.define('ConfiguracionEmpresa', {
    idConfiguracion: {
        type: DataTypes.CHAR(36),
        field: 'id_configuracion',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false,
        unique: true,
        comment: 'Cada empresa tiene una sola configuración'
    },

    // ==========================================
    // PERSONALIZACIÓN VISUAL
    // ==========================================
    colorPrimario: {
        type: DataTypes.STRING(7),
        field: 'color_primario',
        allowNull: false,
        defaultValue: '#0A2A43',
        validate: {
            is: {
                args: /^#[0-9A-Fa-f]{6}$/,
                msg: 'El color debe estar en formato hexadecimal (#RRGGBB)'
            }
        }
    },
    colorSecundario: {
        type: DataTypes.STRING(7),
        field: 'color_secundario',
        allowNull: false,
        defaultValue: '#27AE60',
        validate: {
            is: {
                args: /^#[0-9A-Fa-f]{6}$/,
                msg: 'El color debe estar en formato hexadecimal (#RRGGBB)'
            }
        }
    },
    colorTexto: {
        type: DataTypes.STRING(7),
        field: 'color_texto',
        allowNull: false,
        defaultValue: '#1F2937'
    },
    colorFondo: {
        type: DataTypes.STRING(7),
        field: 'color_fondo',
        allowNull: false,
        defaultValue: '#FFFFFF'
    },
    fuentePrincipal: {
        type: DataTypes.STRING(100),
        field: 'fuente_principal',
        allowNull: false,
        defaultValue: 'Inter'
    },

    // ==========================================
    // CONFIGURACIÓN REGIONAL
    // ==========================================
    moneda: {
        type: DataTypes.STRING(3),
        field: 'moneda',
        allowNull: false,
        defaultValue: 'COP'
    },
    simboloMoneda: {
        type: DataTypes.STRING(5),
        field: 'simbolo_moneda',
        allowNull: false,
        defaultValue: '$'
    },
    posicionSimboloMoneda: {
        type: DataTypes.ENUM('antes', 'despues'),
        field: 'posicion_simbolo_moneda',
        allowNull: false,
        defaultValue: 'antes'
    },
    separadorDecimal: {
        type: DataTypes.STRING(1),
        field: 'separador_decimal',
        allowNull: false,
        defaultValue: ','
    },
    separadorMiles: {
        type: DataTypes.STRING(1),
        field: 'separador_miles',
        allowNull: false,
        defaultValue: '.'
    },
    zonaHoraria: {
        type: DataTypes.STRING(50),
        field: 'zona_horaria',
        allowNull: false,
        defaultValue: 'America/Bogota'
    },
    idiomaPorDefecto: {
        type: DataTypes.STRING(5),
        field: 'idioma_por_defecto',
        allowNull: false,
        defaultValue: 'es-CO'
    },
    formatoFecha: {
        type: DataTypes.STRING(20),
        field: 'formato_fecha',
        allowNull: false,
        defaultValue: 'DD/MM/YYYY'
    },

    // ==========================================
    // CONFIGURACIÓN FISCAL Y FACTURACIÓN
    // ==========================================
    iva: {
        type: DataTypes.DECIMAL(5, 2),
        field: 'iva',
        allowNull: false,
        defaultValue: 19.00,
        comment: 'Porcentaje de IVA aplicable (Colombia: 19%)'
    },
    aplicaIva: {
        type: DataTypes.BOOLEAN,
        field: 'aplica_iva',
        allowNull: false,
        defaultValue: true
    },
    prefijoFactura: {
        type: DataTypes.STRING(10),
        field: 'prefijo_factura',
        allowNull: false,
        defaultValue: 'FAC'
    },
    consecutivoFactura: {
        type: DataTypes.INTEGER,
        field: 'consecutivo_factura',
        allowNull: false,
        defaultValue: 1
    },
    piePaginaFactura: {
        type: DataTypes.TEXT,
        field: 'pie_pagina_factura',
        allowNull: true
    },

    // ==========================================
    // MÉTODOS DE PAGO ACEPTADOS
    // ==========================================
    aceptaEfectivo: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_efectivo',
        allowNull: false,
        defaultValue: true
    },
    aceptaTarjetaCredito: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_tarjeta_credito',
        allowNull: false,
        defaultValue: false
    },
    aceptaTarjetaDebito: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_tarjeta_debito',
        allowNull: false,
        defaultValue: false
    },
    aceptaTransferencia: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_transferencia',
        allowNull: false,
        defaultValue: false
    },
    aceptaPse: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_pse',
        allowNull: false,
        defaultValue: false
    },
    aceptaNequi: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_nequi',
        allowNull: false,
        defaultValue: false
    },
    aceptaDaviplata: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_daviplata',
        allowNull: false,
        defaultValue: false
    },
    aceptaPayU: {
        type: DataTypes.BOOLEAN,
        field: 'acepta_payu',
        allowNull: false,
        defaultValue: false
    },
    cuentasBancarias: {
        type: DataTypes.JSON,
        field: 'cuentas_bancarias',
        allowNull: true,
        defaultValue: [],
        comment: 'Array con cuentas bancarias: [{banco, tipo, numero, titular}]'
    },

    // ==========================================
    // CONFIGURACIÓN DE PEDIDOS
    // ==========================================
    montoMinimoPedido: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'monto_minimo_pedido',
        allowNull: false,
        defaultValue: 0.00
    },
    montoMinimoDomicilio: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'monto_minimo_domicilio',
        allowNull: false,
        defaultValue: 0.00
    },
    costoDomicilioBase: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'costo_domicilio_base',
        allowNull: false,
        defaultValue: 0.00
    },
    tiempoEstimadoPreparacionMin: {
        type: DataTypes.INTEGER,
        field: 'tiempo_estimado_preparacion_min',
        allowNull: false,
        defaultValue: 30
    },
    tiempoEstimadoEntregaMin: {
        type: DataTypes.INTEGER,
        field: 'tiempo_estimado_entrega_min',
        allowNull: false,
        defaultValue: 45
    },
    permitePedidosProgramados: {
        type: DataTypes.BOOLEAN,
        field: 'permite_pedidos_programados',
        allowNull: false,
        defaultValue: false
    },
    diasProgramacionAdelantada: {
        type: DataTypes.INTEGER,
        field: 'dias_programacion_adelantada',
        allowNull: false,
        defaultValue: 7
    },

    // ==========================================
    // NOTIFICACIONES
    // ==========================================
    notificarNuevoPedido: {
        type: DataTypes.BOOLEAN,
        field: 'notificar_nuevo_pedido',
        allowNull: false,
        defaultValue: true
    },
    notificarStockBajo: {
        type: DataTypes.BOOLEAN,
        field: 'notificar_stock_bajo',
        allowNull: false,
        defaultValue: true
    },
    notificarNuevaResena: {
        type: DataTypes.BOOLEAN,
        field: 'notificar_nueva_resena',
        allowNull: false,
        defaultValue: true
    },
    canalNotificacionPedidos: {
        type: DataTypes.ENUM('email', 'push', 'ambos', 'ninguno'),
        field: 'canal_notificacion_pedidos',
        allowNull: false,
        defaultValue: 'ambos'
    },
    sonidoNotificacion: {
        type: DataTypes.BOOLEAN,
        field: 'sonido_notificacion',
        allowNull: false,
        defaultValue: true
    },

    // ==========================================
    // POLÍTICAS Y MENSAJES
    // ==========================================
    mensajeBienvenida: {
        type: DataTypes.TEXT,
        field: 'mensaje_bienvenida',
        allowNull: true,
        defaultValue: 'Bienvenido a nuestra tienda. Estamos felices de atenderte.'
    },
    politicaDevoluciones: {
        type: DataTypes.TEXT,
        field: 'politica_devoluciones',
        allowNull: true
    },
    politicaPrivacidad: {
        type: DataTypes.TEXT,
        field: 'politica_privacidad',
        allowNull: true
    },
    terminosCondiciones: {
        type: DataTypes.TEXT,
        field: 'terminos_condiciones',
        allowNull: true
    },
    mensajeAgradecimiento: {
        type: DataTypes.TEXT,
        field: 'mensaje_agradecimiento',
        allowNull: true,
        defaultValue: 'Gracias por tu compra. ¡Vuelve pronto!'
    },

    // ==========================================
    // INTEGRACIONES (PARA PLANES PREMIUM)
    // ==========================================
    googleAnalyticsId: {
        type: DataTypes.STRING(50),
        field: 'google_analytics_id',
        allowNull: true
    },
    facebookPixelId: {
        type: DataTypes.STRING(50),
        field: 'facebook_pixel_id',
        allowNull: true
    },
    webhookPedidos: {
        type: DataTypes.STRING(500),
        field: 'webhook_pedidos',
        allowNull: true,
        comment: 'URL externa donde notificar cuando llegan pedidos'
    },

    // ==========================================
    // SEGURIDAD Y OPERACIÓN
    // ==========================================
    requiere2faAdmin: {
        type: DataTypes.BOOLEAN,
        field: 'requiere_2fa_admin',
        allowNull: false,
        defaultValue: false
    },
    sesionMaxMinutos: {
        type: DataTypes.INTEGER,
        field: 'sesion_max_minutos',
        allowNull: false,
        defaultValue: 480
    },
    modoMantenimiento: {
        type: DataTypes.BOOLEAN,
        field: 'modo_mantenimiento',
        allowNull: false,
        defaultValue: false
    },
    mensajeMantenimiento: {
        type: DataTypes.TEXT,
        field: 'mensaje_mantenimiento',
        allowNull: true,
        defaultValue: 'Estamos en mantenimiento. Volveremos pronto.'
    }
}, {
    tableName: 'configuracion_empresa',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: 'fecha_actualizacion',
    underscored: true
});

/**
 * Devuelve la lista de métodos de pago que la empresa tiene activos
 */
ConfiguracionEmpresa.prototype.metodosPagoActivos = function() {
    const metodos = [];
    if (this.aceptaEfectivo) metodos.push('efectivo');
    if (this.aceptaTarjetaCredito) metodos.push('tarjeta_credito');
    if (this.aceptaTarjetaDebito) metodos.push('tarjeta_debito');
    if (this.aceptaTransferencia) metodos.push('transferencia');
    if (this.aceptaPse) metodos.push('pse');
    if (this.aceptaNequi) metodos.push('nequi');
    if (this.aceptaDaviplata) metodos.push('daviplata');
    if (this.aceptaPayU) metodos.push('payu');
    return metodos;
};

/**
 * Formatea un número como moneda según la configuración
 */
ConfiguracionEmpresa.prototype.formatearMoneda = function(monto) {
    const numero = parseFloat(monto || 0);
    const partes = numero.toFixed(2).split('.');
    const entero = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, this.separadorMiles);
    const formateado = `${entero}${this.separadorDecimal}${partes[1]}`;

    return this.posicionSimboloMoneda === 'antes'
        ? `${this.simboloMoneda}${formateado}`
        : `${formateado}${this.simboloMoneda}`;
};

/**
 * Calcula el IVA sobre un monto base
 */
ConfiguracionEmpresa.prototype.calcularIva = function(montoBase) {
    if (!this.aplicaIva) return 0;
    const base = parseFloat(montoBase || 0);
    return (base * parseFloat(this.iva)) / 100;
};

/**
 * Genera el siguiente número de factura con prefijo
 */
ConfiguracionEmpresa.prototype.proximoNumeroFactura = function() {
    return `${this.prefijoFactura}-${String(this.consecutivoFactura).padStart(6, '0')}`;
};

/**
 * Devuelve la configuración pública (visible para clientes del marketplace)
 * Excluye datos sensibles como cuentas bancarias, webhooks, etc.
 */
ConfiguracionEmpresa.prototype.datosPublicos = function() {
    return {
        colorPrimario: this.colorPrimario,
        colorSecundario: this.colorSecundario,
        colorTexto: this.colorTexto,
        colorFondo: this.colorFondo,
        fuentePrincipal: this.fuentePrincipal,
        moneda: this.moneda,
        simboloMoneda: this.simboloMoneda,
        montoMinimoPedido: this.montoMinimoPedido,
        montoMinimoDomicilio: this.montoMinimoDomicilio,
        costoDomicilioBase: this.costoDomicilioBase,
        tiempoEstimadoPreparacionMin: this.tiempoEstimadoPreparacionMin,
        tiempoEstimadoEntregaMin: this.tiempoEstimadoEntregaMin,
        permitePedidosProgramados: this.permitePedidosProgramados,
        mensajeBienvenida: this.mensajeBienvenida,
        politicaDevoluciones: this.politicaDevoluciones,
        terminosCondiciones: this.terminosCondiciones,
        metodosPagoDisponibles: this.metodosPagoActivos()
    };
};

/**
 * Devuelve la configuración por defecto al crear una empresa nueva
 * Esta es la base sobre la que el Administrador personaliza después
 */
ConfiguracionEmpresa.configuracionPorDefecto = function() {
    return {
        colorPrimario: '#0A2A43',
        colorSecundario: '#27AE60',
        colorTexto: '#1F2937',
        colorFondo: '#FFFFFF',
        fuentePrincipal: 'Inter',
        moneda: 'COP',
        simboloMoneda: '$',
        posicionSimboloMoneda: 'antes',
        separadorDecimal: ',',
        separadorMiles: '.',
        zonaHoraria: 'America/Bogota',
        idiomaPorDefecto: 'es-CO',
        formatoFecha: 'DD/MM/YYYY',
        iva: 19.00,
        aplicaIva: true,
        prefijoFactura: 'FAC',
        consecutivoFactura: 1,
        aceptaEfectivo: true,
        montoMinimoPedido: 0.00,
        costoDomicilioBase: 0.00,
        tiempoEstimadoPreparacionMin: 30,
        tiempoEstimadoEntregaMin: 45,
        notificarNuevoPedido: true,
        notificarStockBajo: true,
        notificarNuevaResena: true,
        canalNotificacionPedidos: 'ambos',
        sonidoNotificacion: true,
        mensajeBienvenida: 'Bienvenido a nuestra tienda. Estamos felices de atenderte.',
        mensajeAgradecimiento: 'Gracias por tu compra. ¡Vuelve pronto!',
        sesionMaxMinutos: 480,
        modoMantenimiento: false
    };
};

module.exports = ConfiguracionEmpresa;