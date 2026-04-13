-- ══════════════════════════════════════════════════════════════════
-- PRODVEN - SCRIPT DE CREACIÓN DE BASE DE DATOS
-- Versión: 1.0 | Desarrollador: Jhoan Camilo Rangel
-- Descripción: Sistema integral de gestión empresarial con soporte
--              para modo público y privado, pagos, mensajería,
--              seguimiento GPS y seguridad de alto nivel.
-- ══════════════════════════════════════════════════════════════════

-- Crear y seleccionar la base de datos
CREATE DATABASE IF NOT EXISTS prodven_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE prodven_db;

-- Desactivar revisión de FK durante la creación
SET FOREIGN_KEY_CHECKS = 0;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 1: TABLAS BASE
-- ══════════════════════════════════════════════════════════════════

-- Tabla: empresas
-- Registra todos los negocios que usan ProdVen
CREATE TABLE empresas (
    id_empresa        CHAR(36)        NOT NULL,
    nombre            VARCHAR(150)    NOT NULL,
    slogan            VARCHAR(255)    NULL,
    logo_url          TEXT            NULL,
    nit               VARCHAR(20)     NULL UNIQUE,
    email             VARCHAR(150)    NOT NULL UNIQUE,
    telefono          VARCHAR(20)     NULL,
    direccion         TEXT            NULL,
    ciudad            VARCHAR(100)    NULL,
    pais              VARCHAR(100)    NOT NULL DEFAULT 'Colombia',
    modo              ENUM('privado','publico') NOT NULL DEFAULT 'privado',
    tienda_activa     TINYINT(1)      NOT NULL DEFAULT 0,
    plan              ENUM('gratuito','basico','premium','enterprise') NOT NULL DEFAULT 'gratuito',
    color_primario    VARCHAR(7)      NULL DEFAULT '#0A2A43',
    color_secundario  VARCHAR(7)      NULL DEFAULT '#27AE60',
    activo            TINYINT(1)      NOT NULL DEFAULT 1,
    eliminado         TINYINT(1)      NOT NULL DEFAULT 0,
    fecha_creacion    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: usuarios
-- Almacena todos los usuarios del sistema con soporte para 2FA
CREATE TABLE usuarios (
    id_usuario          CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NULL,
    nombres             VARCHAR(100) NOT NULL,
    apellidos           VARCHAR(100) NOT NULL,
    correo              VARCHAR(150) NOT NULL UNIQUE,
    clave_hash          VARCHAR(255) NOT NULL,
    telefono            VARCHAR(20)  NULL,
    avatar_url          TEXT         NULL,
    rol                 ENUM('superadmin','administrador','vendedor','produccion','supervisor','cliente') NOT NULL DEFAULT 'cliente',
    verificado          TINYINT(1)   NOT NULL DEFAULT 0,
    two_factor_activo   TINYINT(1)   NOT NULL DEFAULT 0,
    two_factor_secret   VARCHAR(255) NULL,
    ultimo_acceso       DATETIME     NULL,
    intentos_fallidos   INT          NOT NULL DEFAULT 0,
    bloqueado_hasta     DATETIME     NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario),
    CONSTRAINT fk_usuario_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_usuario_correo (correo),
    INDEX idx_usuario_rol (rol),
    INDEX idx_usuario_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: categorias
-- Clasificación de productos por empresa
CREATE TABLE categorias (
    id_categoria        CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NULL,
    nombre              VARCHAR(100) NOT NULL,
    descripcion         TEXT         NULL,
    imagen_url          TEXT         NULL,
    orden               INT          NOT NULL DEFAULT 0,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_categoria),
    CONSTRAINT fk_categoria_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_categoria_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: proveedores
-- Proveedores de productos por empresa
CREATE TABLE proveedores (
    id_proveedor        CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    nombre              VARCHAR(150) NOT NULL,
    contacto            VARCHAR(100) NULL,
    telefono            VARCHAR(20)  NULL,
    correo              VARCHAR(150) NULL,
    direccion           TEXT         NULL,
    nit                 VARCHAR(20)  NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_proveedor),
    CONSTRAINT fk_proveedor_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_proveedor_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 2: CONFIGURACIÓN Y SUSCRIPCIONES
-- ══════════════════════════════════════════════════════════════════

-- Tabla: configuracion_empresa
-- Ajustes específicos de cada empresa
CREATE TABLE configuracion_empresa (
    id_configuracion    CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL UNIQUE,
    permite_contra_entrega  TINYINT(1) NOT NULL DEFAULT 1,
    permite_pagos_digitales TINYINT(1) NOT NULL DEFAULT 1,
    permite_pedidos_programados TINYINT(1) NOT NULL DEFAULT 1,
    radio_domicilio_km  DECIMAL(5,2) NOT NULL DEFAULT 5.00,
    costo_domicilio     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    domicilio_gratis_desde DECIMAL(12,2) NULL,
    tiempo_entrega_minutos INT        NOT NULL DEFAULT 30,
    moneda              VARCHAR(10)  NOT NULL DEFAULT 'COP',
    zona_horaria        VARCHAR(50)  NOT NULL DEFAULT 'America/Bogota',
    payu_api_key        VARCHAR(255) NULL,
    payu_merchant_id    VARCHAR(100) NULL,
    payu_account_id     VARCHAR(100) NULL,
    payu_modo           ENUM('sandbox','produccion') NOT NULL DEFAULT 'sandbox',
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_configuracion),
    CONSTRAINT fk_config_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: suscripciones
-- Historial de planes y pagos de suscripción
CREATE TABLE suscripciones (
    id_suscripcion      CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    plan                ENUM('gratuito','basico','premium','enterprise') NOT NULL,
    precio_mensual      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    fecha_inicio        DATETIME     NOT NULL,
    fecha_fin           DATETIME     NULL,
    estado              ENUM('activa','vencida','cancelada','pendiente') NOT NULL DEFAULT 'activa',
    referencia_pago     VARCHAR(100) NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_suscripcion),
    CONSTRAINT fk_suscripcion_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_suscripcion_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 3: PRODUCTOS
-- ══════════════════════════════════════════════════════════════════

-- Tabla: productos
CREATE TABLE productos (
    id_producto         CHAR(36)      NOT NULL,
    id_empresa          CHAR(36)      NOT NULL,
    id_categoria        CHAR(36)      NULL,
    id_proveedor        CHAR(36)      NULL,
    codigo_sku          VARCHAR(50)   NULL UNIQUE,
    nombre              VARCHAR(150)  NOT NULL,
    descripcion         TEXT          NULL,
    precio              DECIMAL(12,2) NOT NULL,
    costo               DECIMAL(12,2) NULL,
    cantidad_stock      INT           NOT NULL DEFAULT 0,
    nivel_reorden       INT           NOT NULL DEFAULT 5,
    unidad              VARCHAR(30)   NOT NULL DEFAULT 'unidad',
    publicado           TINYINT(1)    NOT NULL DEFAULT 0,
    destacado           TINYINT(1)    NOT NULL DEFAULT 0,
    permite_contra_entrega TINYINT(1) NOT NULL DEFAULT 1,
    tiempo_preparacion_min INT        NOT NULL DEFAULT 0,
    calificacion_promedio DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    total_resenas       INT           NOT NULL DEFAULT 0,
    activo              TINYINT(1)    NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)    NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_producto),
    CONSTRAINT fk_producto_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_producto_categoria FOREIGN KEY (id_categoria)
        REFERENCES categorias(id_categoria)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_producto_proveedor FOREIGN KEY (id_proveedor)
        REFERENCES proveedores(id_proveedor)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_precio_positivo CHECK (precio > 0),
    CONSTRAINT chk_stock_positivo CHECK (cantidad_stock >= 0),
    INDEX idx_producto_empresa (id_empresa),
    INDEX idx_producto_publicado (publicado),
    INDEX idx_producto_categoria (id_categoria)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: imagenes_producto
-- Múltiples imágenes por producto
CREATE TABLE imagenes_producto (
    id_imagen           CHAR(36)     NOT NULL,
    id_producto         CHAR(36)     NOT NULL,
    url                 TEXT         NOT NULL,
    es_principal        TINYINT(1)   NOT NULL DEFAULT 0,
    orden               INT          NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_imagen),
    CONSTRAINT fk_imagen_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_imagen_producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: promociones
-- Descuentos y ofertas por producto o empresa
CREATE TABLE promociones (
    id_promocion        CHAR(36)      NOT NULL,
    id_empresa          CHAR(36)      NOT NULL,
    id_producto         CHAR(36)      NULL,
    nombre              VARCHAR(150)  NOT NULL,
    descripcion         TEXT          NULL,
    tipo                ENUM('porcentaje','valor_fijo','2x1','envio_gratis') NOT NULL,
    valor               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    codigo              VARCHAR(50)   NULL UNIQUE,
    uso_maximo          INT           NULL,
    uso_actual          INT           NOT NULL DEFAULT 0,
    fecha_inicio        DATETIME      NOT NULL,
    fecha_fin           DATETIME      NOT NULL,
    activo              TINYINT(1)    NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)    NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_promocion),
    CONSTRAINT fk_promocion_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_promocion_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_promocion_empresa (id_empresa),
    INDEX idx_promocion_codigo (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 4: CLIENTES Y DIRECCIONES
-- ══════════════════════════════════════════════════════════════════

-- Tabla: clientes
CREATE TABLE clientes (
    id_cliente          CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NULL,
    empresa             VARCHAR(150) NULL,
    nit                 VARCHAR(20)  NULL,
    telefono            VARCHAR(20)  NULL,
    correo              VARCHAR(150) NULL,
    fecha_nacimiento    DATE         NULL,
    genero              ENUM('masculino','femenino','otro','prefiero_no_decir') NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_cliente),
    CONSTRAINT fk_cliente_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_cliente_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_cliente_usuario (id_usuario),
    INDEX idx_cliente_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: direcciones_cliente
-- Múltiples direcciones de entrega por cliente
CREATE TABLE direcciones_cliente (
    id_direccion        CHAR(36)     NOT NULL,
    id_cliente          CHAR(36)     NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    direccion           TEXT         NOT NULL,
    ciudad              VARCHAR(100) NOT NULL,
    departamento        VARCHAR(100) NULL,
    codigo_postal       VARCHAR(20)  NULL,
    latitud             DECIMAL(10,8) NULL,
    longitud            DECIMAL(11,8) NULL,
    indicaciones        TEXT         NULL,
    es_principal        TINYINT(1)   NOT NULL DEFAULT 0,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_direccion),
    CONSTRAINT fk_direccion_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_direccion_cliente (id_cliente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 5: CARRITO
-- ══════════════════════════════════════════════════════════════════

-- Tabla: carrito
CREATE TABLE carrito (
    id_carrito          CHAR(36)     NOT NULL,
    id_cliente          CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    id_promocion        CHAR(36)     NULL,
    subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    costo_domicilio     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total               DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado              ENUM('activo','abandonado','convertido') NOT NULL DEFAULT 'activo',
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_carrito),
    CONSTRAINT fk_carrito_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_carrito_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_carrito_promocion FOREIGN KEY (id_promocion)
        REFERENCES promociones(id_promocion)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_carrito_cliente (id_cliente),
    INDEX idx_carrito_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: items_carrito
CREATE TABLE items_carrito (
    id_item             CHAR(36)      NOT NULL,
    id_carrito          CHAR(36)      NOT NULL,
    id_producto         CHAR(36)      NOT NULL,
    cantidad            INT           NOT NULL DEFAULT 1,
    precio_unitario     DECIMAL(12,2) NOT NULL,
    descuento           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal            DECIMAL(12,2) NOT NULL,
    notas               TEXT          NULL,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_item),
    CONSTRAINT fk_item_carrito FOREIGN KEY (id_carrito)
        REFERENCES carrito(id_carrito)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_item_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT chk_cantidad_positiva CHECK (cantidad > 0),
    INDEX idx_item_carrito (id_carrito)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 6: PEDIDOS Y SEGUIMIENTO
-- ══════════════════════════════════════════════════════════════════

-- Tabla: pedidos
CREATE TABLE pedidos (
    id_pedido           CHAR(36)      NOT NULL,
    id_empresa          CHAR(36)      NOT NULL,
    id_cliente          CHAR(36)      NOT NULL,
    id_direccion        CHAR(36)      NULL,
    id_promocion        CHAR(36)      NULL,
    numero_pedido       VARCHAR(50)   NOT NULL UNIQUE,
    tipo_entrega        ENUM('domicilio','recogida','en_sitio') NOT NULL DEFAULT 'domicilio',
    tipo_pago           ENUM('digital','contra_entrega','mixto') NOT NULL DEFAULT 'digital',
    estado              ENUM('pendiente','confirmado','en_preparacion','en_camino','entregado','cancelado','reembolsado') NOT NULL DEFAULT 'pendiente',
    subtotal            DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    descuento           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    impuestos           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    costo_domicilio     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total               DECIMAL(12,2) NOT NULL,
    notas               TEXT          NULL,
    direccion_envio     TEXT          NULL,
    latitud_entrega     DECIMAL(10,8) NULL,
    longitud_entrega    DECIMAL(11,8) NULL,
    fecha_pedido        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_confirmacion  DATETIME      NULL,
    fecha_entrega_real  DATETIME      NULL,
    creado_por          CHAR(36)      NOT NULL,
    activo              TINYINT(1)    NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)    NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_pedido),
    CONSTRAINT fk_pedido_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_direccion FOREIGN KEY (id_direccion)
        REFERENCES direcciones_cliente(id_direccion)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_promocion FOREIGN KEY (id_promocion)
        REFERENCES promociones(id_promocion)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_pedido_creado_por FOREIGN KEY (creado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_pedido_empresa (id_empresa),
    INDEX idx_pedido_cliente (id_cliente),
    INDEX idx_pedido_estado (estado),
    INDEX idx_pedido_numero (numero_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: detalles_pedido
CREATE TABLE detalles_pedido (
    id_detalle          CHAR(36)      NOT NULL,
    id_pedido           CHAR(36)      NOT NULL,
    id_producto         CHAR(36)      NOT NULL,
    cantidad            INT           NOT NULL,
    precio_unitario     DECIMAL(12,2) NOT NULL,
    descuento           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    subtotal            DECIMAL(12,2) NOT NULL,
    notas               TEXT          NULL,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_detalle),
    CONSTRAINT fk_detalle_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_detalle_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_detalle_pedido (id_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: seguimiento_pedido
-- Estados del pedido en tiempo real
CREATE TABLE seguimiento_pedido (
    id_seguimiento      CHAR(36)     NOT NULL,
    id_pedido           CHAR(36)     NOT NULL,
    estado              ENUM('pendiente','confirmado','en_preparacion','en_camino','entregado','cancelado','reembolsado') NOT NULL,
    descripcion         TEXT         NULL,
    latitud             DECIMAL(10,8) NULL,
    longitud            DECIMAL(11,8) NULL,
    registrado_por      CHAR(36)     NOT NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_seguimiento),
    CONSTRAINT fk_seguimiento_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_seguimiento_usuario FOREIGN KEY (registrado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_seguimiento_pedido (id_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: ubicacion_pedido
-- Coordenadas GPS del domiciliario en tiempo real
CREATE TABLE ubicacion_pedido (
    id_ubicacion        CHAR(36)      NOT NULL,
    id_pedido           CHAR(36)      NOT NULL,
    id_domiciliario     CHAR(36)      NOT NULL,
    latitud             DECIMAL(10,8) NOT NULL,
    longitud            DECIMAL(11,8) NOT NULL,
    velocidad           DECIMAL(5,2)  NULL,
    fecha_registro      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_ubicacion),
    CONSTRAINT fk_ubicacion_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ubicacion_domiciliario FOREIGN KEY (id_domiciliario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_ubicacion_pedido (id_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: pedidos_programados
-- Pedidos agendados para una hora específica
CREATE TABLE pedidos_programados (
    id_programado       CHAR(36)     NOT NULL,
    id_pedido           CHAR(36)     NOT NULL UNIQUE,
    fecha_programada    DATETIME     NOT NULL,
    notas               TEXT         NULL,
    estado              ENUM('pendiente','confirmado','procesado','cancelado') NOT NULL DEFAULT 'pendiente',
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_programado),
    CONSTRAINT fk_programado_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_programado_fecha (fecha_programada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 7: PAGOS Y FACTURACIÓN
-- ══════════════════════════════════════════════════════════════════

-- Tabla: facturas
CREATE TABLE facturas (
    id_factura          CHAR(36)      NOT NULL,
    id_pedido           CHAR(36)      NOT NULL UNIQUE,
    id_empresa          CHAR(36)      NOT NULL,
    numero_factura      VARCHAR(50)   NOT NULL UNIQUE,
    fecha_emision       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_vencimiento   DATETIME      NULL,
    monto               DECIMAL(12,2) NOT NULL,
    impuestos           DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    estado              ENUM('pagada','pendiente','vencida','anulada') NOT NULL DEFAULT 'pendiente',
    creado_por          CHAR(36)      NOT NULL,
    activo              TINYINT(1)    NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)    NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_factura),
    CONSTRAINT fk_factura_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_factura_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_factura_creado_por FOREIGN KEY (creado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_factura_empresa (id_empresa),
    INDEX idx_factura_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: pagos
CREATE TABLE pagos (
    id_pago             CHAR(36)      NOT NULL,
    id_pedido           CHAR(36)      NOT NULL,
    id_empresa          CHAR(36)      NOT NULL,
    monto               DECIMAL(12,2) NOT NULL,
    metodo              ENUM('tarjeta_credito','tarjeta_debito','pse','efectivo','billetera_digital','contra_entrega') NOT NULL,
    estado              ENUM('completado','fallido','pendiente','reembolsado','en_proceso') NOT NULL DEFAULT 'pendiente',
    referencia          VARCHAR(100)  NULL,
    fecha_pago          DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creado_por          CHAR(36)      NOT NULL,
    activo              TINYINT(1)    NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_pago),
    CONSTRAINT fk_pago_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pago_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_pago_creado_por FOREIGN KEY (creado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_pago_pedido (id_pedido),
    INDEX idx_pago_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: transacciones_payu
-- Registro completo de transacciones con PayU
CREATE TABLE transacciones_payu (
    id_transaccion      CHAR(36)     NOT NULL,
    id_pago             CHAR(36)     NOT NULL,
    payu_order_id       VARCHAR(100) NULL,
    payu_transaction_id VARCHAR(100) NULL,
    payu_reference      VARCHAR(100) NOT NULL,
    estado_payu         VARCHAR(50)  NOT NULL,
    codigo_respuesta    VARCHAR(50)  NULL,
    mensaje_respuesta   TEXT         NULL,
    valor               DECIMAL(12,2) NOT NULL,
    moneda              VARCHAR(10)  NOT NULL DEFAULT 'COP',
    ip_cliente          VARCHAR(45)  NULL,
    datos_completos     JSON         NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_transaccion),
    CONSTRAINT fk_transaccion_pago FOREIGN KEY (id_pago)
        REFERENCES pagos(id_pago)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_transaccion_payu_reference (payu_reference),
    INDEX idx_transaccion_pago (id_pago)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: reembolsos
CREATE TABLE reembolsos (
    id_reembolso        CHAR(36)      NOT NULL,
    id_pago             CHAR(36)      NOT NULL,
    id_pedido           CHAR(36)      NOT NULL,
    monto               DECIMAL(12,2) NOT NULL,
    motivo              TEXT          NOT NULL,
    estado              ENUM('solicitado','aprobado','procesado','rechazado') NOT NULL DEFAULT 'solicitado',
    referencia_payu     VARCHAR(100)  NULL,
    aprobado_por        CHAR(36)      NULL,
    fecha_aprobacion    DATETIME      NULL,
    fecha_creacion      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_reembolso),
    CONSTRAINT fk_reembolso_pago FOREIGN KEY (id_pago)
        REFERENCES pagos(id_pago)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reembolso_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reembolso_aprobado FOREIGN KEY (aprobado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_reembolso_pedido (id_pedido)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: metodos_pago_vendedor
CREATE TABLE metodos_pago_vendedor (
    id_metodo           CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    metodo              ENUM('tarjeta_credito','tarjeta_debito','pse','efectivo','billetera_digital','contra_entrega') NOT NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_metodo),
    CONSTRAINT fk_metodo_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uk_empresa_metodo (id_empresa, metodo),
    INDEX idx_metodo_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 8: PRODUCCIÓN E INVENTARIO
-- ══════════════════════════════════════════════════════════════════

-- Tabla: ordenes_produccion
CREATE TABLE ordenes_produccion (
    id_produccion       CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    id_producto         CHAR(36)     NOT NULL,
    cantidad            INT          NOT NULL,
    estado              ENUM('programada','en_proceso','completada','cancelada') NOT NULL DEFAULT 'programada',
    fecha_programada    DATETIME     NOT NULL,
    fecha_inicio        DATETIME     NULL,
    fecha_fin           DATETIME     NULL,
    notas               TEXT         NULL,
    creado_por          CHAR(36)     NOT NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_produccion),
    CONSTRAINT fk_produccion_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_produccion_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_produccion_creado FOREIGN KEY (creado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_produccion_empresa (id_empresa),
    INDEX idx_produccion_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: materiales_produccion
CREATE TABLE materiales_produccion (
    id_material         CHAR(36)     NOT NULL,
    id_produccion       CHAR(36)     NOT NULL,
    id_producto_material CHAR(36)    NOT NULL,
    cantidad_requerida  DECIMAL(12,2) NOT NULL,
    cantidad_consumida  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unidad              VARCHAR(30)  NOT NULL DEFAULT 'unidad',
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_material),
    CONSTRAINT fk_material_produccion FOREIGN KEY (id_produccion)
        REFERENCES ordenes_produccion(id_produccion)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_material_producto FOREIGN KEY (id_producto_material)
        REFERENCES productos(id_producto)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_material_produccion (id_produccion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: movimientos_inventario
CREATE TABLE movimientos_inventario (
    id_movimiento       CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    id_producto         CHAR(36)     NOT NULL,
    cantidad            INT          NOT NULL,
    tipo_movimiento     ENUM('entrada','salida','ajuste','devolucion') NOT NULL,
    tabla_referencia    VARCHAR(50)  NULL,
    id_referencia       CHAR(36)     NULL,
    notas               TEXT         NULL,
    creado_por          CHAR(36)     NOT NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_movimiento),
    CONSTRAINT fk_movimiento_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_movimiento_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_movimiento_usuario FOREIGN KEY (creado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_movimiento_empresa (id_empresa),
    INDEX idx_movimiento_producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 9: MENSAJERÍA
-- ══════════════════════════════════════════════════════════════════

-- Tabla: conversaciones
CREATE TABLE conversaciones (
    id_conversacion     CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    tipo                ENUM('interna','cliente') NOT NULL DEFAULT 'cliente',
    asunto              VARCHAR(255) NULL,
    estado              ENUM('activa','archivada','cerrada') NOT NULL DEFAULT 'activa',
    ultimo_mensaje      TEXT         NULL,
    fecha_ultimo_mensaje DATETIME    NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_conversacion),
    CONSTRAINT fk_conversacion_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_conversacion_empresa (id_empresa),
    INDEX idx_conversacion_tipo (tipo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: participantes_conversacion
CREATE TABLE participantes_conversacion (
    id_participante     CHAR(36)     NOT NULL,
    id_conversacion     CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NOT NULL,
    rol                 ENUM('admin','agente','cliente') NOT NULL DEFAULT 'cliente',
    fecha_ingreso       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_ultimo_visto  DATETIME     NULL,
    PRIMARY KEY (id_participante),
    CONSTRAINT fk_participante_conversacion FOREIGN KEY (id_conversacion)
        REFERENCES conversaciones(id_conversacion)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_participante_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uk_conversacion_usuario (id_conversacion, id_usuario),
    INDEX idx_participante_conversacion (id_conversacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: mensajes
CREATE TABLE mensajes (
    id_mensaje          CHAR(36)     NOT NULL,
    id_conversacion     CHAR(36)     NOT NULL,
    id_remitente        CHAR(36)     NOT NULL,
    contenido           TEXT         NOT NULL,
    tipo_contenido      ENUM('texto','imagen','archivo','audio','video') NOT NULL DEFAULT 'texto',
    url_archivo         TEXT         NULL,
    leido               TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_lectura       DATETIME     NULL,
    eliminado           TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_mensaje),
    CONSTRAINT fk_mensaje_conversacion FOREIGN KEY (id_conversacion)
        REFERENCES conversaciones(id_conversacion)
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_mensaje_remitente FOREIGN KEY (id_remitente)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_mensaje_conversacion (id_conversacion),
    INDEX idx_mensaje_remitente (id_remitente)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 10: SEGURIDAD Y AUTENTICACIÓN
-- ══════════════════════════════════════════════════════════════════

-- Tabla: tokens_acceso
-- JWT y refresh tokens activos
CREATE TABLE tokens_acceso (
    id_token            CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NOT NULL,
    token               TEXT         NOT NULL,
    tipo                ENUM('access','refresh') NOT NULL DEFAULT 'access',
    ip_origen           VARCHAR(45)  NULL,
    dispositivo         VARCHAR(255) NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_expiracion    DATETIME     NOT NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_token),
    CONSTRAINT fk_token_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_token_usuario (id_usuario),
    INDEX idx_token_expiracion (fecha_expiracion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: codigos_verificacion
-- Verificación de correo y 2FA
CREATE TABLE codigos_verificacion (
    id_codigo           CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NOT NULL,
    codigo              VARCHAR(10)  NOT NULL,
    tipo                ENUM('verificacion_correo','recuperacion_password','2fa','cambio_correo') NOT NULL,
    usado               TINYINT(1)   NOT NULL DEFAULT 0,
    intentos            INT          NOT NULL DEFAULT 0,
    fecha_expiracion    DATETIME     NOT NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_codigo),
    CONSTRAINT fk_codigo_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_codigo_usuario (id_usuario),
    INDEX idx_codigo_expiracion (fecha_expiracion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: logs_actividad
-- Registro de acciones por seguridad
CREATE TABLE logs_actividad (
    id_log              CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NULL,
    id_empresa          CHAR(36)     NULL,
    accion              VARCHAR(100) NOT NULL,
    descripcion         TEXT         NULL,
    ip                  VARCHAR(45)  NULL,
    dispositivo         VARCHAR(255) NULL,
    datos_extra         JSON         NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_log),
    CONSTRAINT fk_log_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_log_usuario (id_usuario),
    INDEX idx_log_empresa (id_empresa),
    INDEX idx_log_fecha (fecha_creacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 11: RESEÑAS Y NOTIFICACIONES
-- ══════════════════════════════════════════════════════════════════

-- Tabla: resenas
CREATE TABLE resenas (
    id_resena           CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    id_producto         CHAR(36)     NULL,
    id_cliente          CHAR(36)     NOT NULL,
    id_pedido           CHAR(36)     NULL,
    calificacion        TINYINT      NOT NULL,
    titulo              VARCHAR(150) NULL,
    comentario          TEXT         NULL,
    visible             TINYINT(1)   NOT NULL DEFAULT 1,
    eliminado           TINYINT(1)   NOT NULL DEFAULT 0,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_resena),
    CONSTRAINT fk_resena_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_resena_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT fk_resena_cliente FOREIGN KEY (id_cliente)
        REFERENCES clientes(id_cliente)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_resena_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido)
        ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_calificacion CHECK (calificacion BETWEEN 1 AND 5),
    INDEX idx_resena_empresa (id_empresa),
    INDEX idx_resena_producto (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: notificaciones
CREATE TABLE notificaciones (
    id_notificacion     CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NULL,
    titulo              VARCHAR(150) NOT NULL,
    mensaje             TEXT         NOT NULL,
    tipo                ENUM('pedido','pago','inventario','mensaje','sistema','promocion') NOT NULL DEFAULT 'sistema',
    canal               ENUM('email','sms','push','sistema') NOT NULL DEFAULT 'sistema',
    leida               TINYINT(1)   NOT NULL DEFAULT 0,
    url_accion          TEXT         NULL,
    fecha_envio         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_notificacion),
    CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_notificacion_usuario (id_usuario),
    INDEX idx_notificacion_leida (leida)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: notificaciones_push
CREATE TABLE notificaciones_push (
    id_push             CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NOT NULL,
    token_dispositivo   TEXT         NOT NULL,
    plataforma          ENUM('android','ios','web') NOT NULL,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_push),
    CONSTRAINT fk_push_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario)
        ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_push_usuario (id_usuario)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- BLOQUE 12: REPORTES Y AUDITORÍA
-- ══════════════════════════════════════════════════════════════════

-- Tabla: reportes
CREATE TABLE reportes (
    id_reporte          CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    tipo                VARCHAR(100) NOT NULL,
    parametros          JSON         NULL,
    generado_por        CHAR(36)     NOT NULL,
    estado              ENUM('generado','en_proceso','error','cancelado') NOT NULL DEFAULT 'en_proceso',
    enlace_archivo      TEXT         NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_reporte),
    CONSTRAINT fk_reporte_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reporte_usuario FOREIGN KEY (generado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_reporte_empresa (id_empresa)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla: registros_auditoria
CREATE TABLE registros_auditoria (
    id_registro         CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NULL,
    entidad             VARCHAR(100) NOT NULL,
    id_entidad          CHAR(36)     NOT NULL,
    accion              ENUM('INSERT','UPDATE','DELETE') NOT NULL,
    valor_anterior      JSON         NULL,
    valor_nuevo         JSON         NULL,
    realizado_por       CHAR(36)     NULL,
    ip                  VARCHAR(45)  NULL,
    fecha_accion        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_registro),
    CONSTRAINT fk_auditoria_usuario FOREIGN KEY (realizado_por)
        REFERENCES usuarios(id_usuario)
        ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_auditoria_entidad (entidad),
    INDEX idx_auditoria_empresa (id_empresa),
    INDEX idx_auditoria_fecha (fecha_accion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ══════════════════════════════════════════════════════════════════
-- REACTIVAR REVISIÓN DE FK
-- ══════════════════════════════════════════════════════════════════
SET FOREIGN_KEY_CHECKS = 1;

-- ══════════════════════════════════════════════════════════════════
-- FIN DEL SCRIPT - PRODVEN v1.0
-- Total de tablas creadas: 36
-- Desarrollador: Jhoan Camilo Rangel
-- ══════════════════════════════════════════════════════════════════