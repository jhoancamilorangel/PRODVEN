-- =====================================================
-- PRODVEN - CORRECCIONES COMPLETAS (VERSIÓN FINAL)
-- =====================================================

USE prodven_db;

-- =====================================================
-- 1. ÍNDICES FULLTEXT
-- =====================================================
ALTER TABLE productos DROP INDEX IF EXISTS idx_producto_busqueda;
ALTER TABLE productos ADD FULLTEXT INDEX idx_producto_busqueda (nombre, descripcion);

-- =====================================================
-- 2. ÍNDICES COMPUESTOS
-- =====================================================
DROP INDEX IF EXISTS idx_pedido_fecha_estado_empresa ON pedidos;
DROP INDEX IF EXISTS idx_pedido_empresa_fecha ON pedidos;
DROP INDEX IF EXISTS idx_log_actividad_fecha ON logs_actividad;
DROP INDEX IF EXISTS idx_movimiento_fecha ON movimientos_inventario;
DROP INDEX IF EXISTS idx_ubicacion_fecha ON ubicacion_pedido;
DROP INDEX IF EXISTS idx_notificacion_usuario_leida ON notificaciones;
DROP INDEX IF EXISTS idx_mensaje_conversacion_fecha ON mensajes;

CREATE INDEX idx_pedido_fecha_estado_empresa ON pedidos(fecha_pedido, estado, id_empresa);
CREATE INDEX idx_pedido_empresa_fecha ON pedidos(id_empresa, fecha_pedido);
CREATE INDEX idx_log_actividad_fecha ON logs_actividad(fecha_creacion, id_empresa);
CREATE INDEX idx_movimiento_fecha ON movimientos_inventario(fecha_creacion, id_producto);
CREATE INDEX idx_ubicacion_fecha ON ubicacion_pedido(fecha_registro, id_pedido);
CREATE INDEX idx_notificacion_usuario_leida ON notificaciones(id_usuario, leida, fecha_envio);
CREATE INDEX idx_mensaje_conversacion_fecha ON mensajes(id_conversacion, fecha_creacion);

-- =====================================================
-- 3. TABLA: reservas_stock
-- =====================================================
CREATE TABLE IF NOT EXISTS reservas_stock (
    id_reserva          CHAR(36)     NOT NULL,
    id_producto         CHAR(36)     NOT NULL,
    id_pedido           CHAR(36)     NOT NULL,
    cantidad            INT          NOT NULL,
    estado              ENUM('activa','confirmada','cancelada','expirada') NOT NULL DEFAULT 'activa',
    fecha_expiracion    DATETIME     NOT NULL,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_reserva),
    CONSTRAINT fk_reserva_producto FOREIGN KEY (id_producto)
        REFERENCES productos(id_producto) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_reserva_pedido FOREIGN KEY (id_pedido)
        REFERENCES pedidos(id_pedido) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_reserva_producto_estado (id_producto, estado),
    INDEX idx_reserva_expiracion (fecha_expiracion),
    INDEX idx_reserva_pedido (id_pedido),
    INDEX idx_reserva_activas (id_producto, estado, fecha_expiracion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 4. TABLA: zonas_cobertura
-- =====================================================
CREATE TABLE IF NOT EXISTS zonas_cobertura (
    id_zona             CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    nombre              VARCHAR(100) NOT NULL,
    tipo                ENUM('circulo','poligono','ciudad','barrio') NOT NULL DEFAULT 'circulo',
    latitud_centro      DECIMAL(10,8) NULL,
    longitud_centro     DECIMAL(11,8) NULL,
    radio_km            DECIMAL(5,2) NULL,
    poligono_geojson    JSON         NULL,
    costo_adicional     DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tiempo_estimado_min INT          NOT NULL DEFAULT 30,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_zona),
    CONSTRAINT fk_zona_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_zona_empresa_activo (id_empresa, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 5. TABLA: domiciliarios
-- =====================================================
CREATE TABLE IF NOT EXISTS domiciliarios (
    id_domiciliario     CHAR(36)     NOT NULL,
    id_empresa          CHAR(36)     NOT NULL,
    id_usuario          CHAR(36)     NOT NULL,
    tipo_vehiculo       ENUM('moto','carro','bicicleta','pie') NOT NULL DEFAULT 'moto',
    placa               VARCHAR(20)  NULL,
    documento_identidad VARCHAR(20)  NOT NULL,
    licencia_conduccion VARCHAR(50)  NULL,
    disponible          TINYINT(1)   NOT NULL DEFAULT 1,
    ultima_latitud      DECIMAL(10,8) NULL,
    ultima_longitud     DECIMAL(11,8) NULL,
    ultima_actualizacion DATETIME    NULL,
    calificacion_promedio DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    activo              TINYINT(1)   NOT NULL DEFAULT 1,
    fecha_creacion      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id_domiciliario),
    CONSTRAINT fk_domiciliario_empresa FOREIGN KEY (id_empresa)
        REFERENCES empresas(id_empresa) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_domiciliario_usuario FOREIGN KEY (id_usuario)
        REFERENCES usuarios(id_usuario) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uk_domiciliario_empresa_usuario (id_empresa, id_usuario),
    INDEX idx_domiciliario_disponible (id_empresa, disponible)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =====================================================
-- 6. UNIQUE KEY en notificaciones_push
-- =====================================================
ALTER TABLE notificaciones_push DROP INDEX IF EXISTS idx_unique_usuario_token;
ALTER TABLE notificaciones_push ADD UNIQUE INDEX idx_unique_usuario_token (id_usuario, token_dispositivo(255));

-- =====================================================
-- 7. TRIGGERS
-- =====================================================

DROP TRIGGER IF EXISTS trg_actualizar_calificacion_promedio;
DROP TRIGGER IF EXISTS trg_actualizar_calificacion_update;

DELIMITER $$

CREATE TRIGGER trg_actualizar_calificacion_promedio
AFTER INSERT ON resenas
FOR EACH ROW
BEGIN
    DECLARE nuevo_promedio DECIMAL(3,2);
    DECLARE total_resenas INT;
    
    SELECT AVG(calificacion), COUNT(*)
    INTO nuevo_promedio, total_resenas
    FROM resenas
    WHERE id_producto = NEW.id_producto AND visible = 1 AND eliminado = 0;
    
    UPDATE productos
    SET calificacion_promedio = nuevo_promedio,
        total_resenas = total_resenas
    WHERE id_producto = NEW.id_producto;
END$$

CREATE TRIGGER trg_actualizar_calificacion_update
AFTER UPDATE ON resenas
FOR EACH ROW
BEGIN
    DECLARE nuevo_promedio DECIMAL(3,2);
    DECLARE total_resenas INT;
    
    IF OLD.visible != NEW.visible OR OLD.eliminado != NEW.eliminado OR OLD.calificacion != NEW.calificacion THEN
        SELECT AVG(calificacion), COUNT(*)
        INTO nuevo_promedio, total_resenas
        FROM resenas
        WHERE id_producto = NEW.id_producto AND visible = 1 AND eliminado = 0;
        
        UPDATE productos
        SET calificacion_promedio = nuevo_promedio,
            total_resenas = total_resenas
        WHERE id_producto = NEW.id_producto;
    END IF;
END$$

DELIMITER ;

-- =====================================================
-- 8. PROCEDIMIENTOS ALMACENADOS
-- =====================================================

DROP PROCEDURE IF EXISTS sp_limpiar_carritos_abandonados;
DROP PROCEDURE IF EXISTS sp_limpiar_reservas_expiradas;

DELIMITER $$

CREATE PROCEDURE sp_limpiar_carritos_abandonados()
BEGIN
    UPDATE carrito
    SET estado = 'abandonado'
    WHERE estado = 'activo'
      AND fecha_actualizacion < DATE_SUB(NOW(), INTERVAL 7 DAY);
END$$

CREATE PROCEDURE sp_limpiar_reservas_expiradas()
BEGIN
    UPDATE reservas_stock
    SET estado = 'expirada'
    WHERE estado = 'activa'
      AND fecha_expiracion < NOW();
    
    UPDATE productos p
    INNER JOIN reservas_stock r ON p.id_producto = r.id_producto
    SET p.cantidad_stock = p.cantidad_stock + r.cantidad
    WHERE r.estado = 'expirada'
      AND r.fecha_expiracion >= DATE_SUB(NOW(), INTERVAL 1 HOUR);
END$$

DELIMITER ;

-- =====================================================
-- 9. EVENTOS
-- =====================================================

SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS evt_limpiar_carritos;
DROP EVENT IF EXISTS evt_limpiar_reservas;
DROP EVENT IF EXISTS evt_limpiar_tokens;
DROP EVENT IF EXISTS evt_limpiar_codigos;

CREATE EVENT evt_limpiar_carritos
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE(), ' 03:00:00')
DO
CALL sp_limpiar_carritos_abandonados();

CREATE EVENT evt_limpiar_reservas
ON SCHEDULE EVERY 1 HOUR
DO
CALL sp_limpiar_reservas_expiradas();

CREATE EVENT evt_limpiar_tokens
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE(), ' 04:00:00')
DO
DELETE FROM tokens_acceso WHERE fecha_expiracion < NOW();

CREATE EVENT evt_limpiar_codigos
ON SCHEDULE EVERY 1 DAY
STARTS CONCAT(CURDATE(), ' 04:30:00')
DO
DELETE FROM codigos_verificacion WHERE fecha_expiracion < NOW();

-- =====================================================
-- 10. VERIFICACIÓN FINAL
-- =====================================================

SELECT '=== CORRECCIONES APLICADAS ===' AS status;

SELECT table_name, index_name 
FROM information_schema.statistics 
WHERE table_schema = 'prodven_db' 
  AND index_name IN ('idx_producto_busqueda', 'idx_pedido_fecha_estado_empresa', 'idx_movimiento_fecha');

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'prodven_db' 
  AND table_name IN ('reservas_stock', 'zonas_cobertura', 'domiciliarios');

SELECT trigger_name, event_manipulation 
FROM information_schema.triggers 
WHERE trigger_schema = 'prodven_db';

SELECT event_name, status 
FROM information_schema.events 
WHERE event_schema = 'prodven_db';

-- =====================================================
-- FIN DEL SCRIPT
-- =====================================================