const ConfiguracionEmpresa = require('../models/ConfiguracionEmpresa');
const { sanitizarDatosActualizacion } = require('../utils/tenantHelper');
const { sendResponse } = require('../utils/response');
const logger = require('../config/logger');

/**
 * GET /api/configuracion
 * Obtiene la configuración de la empresa del usuario autenticado
 * Acceso: Cualquier usuario de la empresa
 */
const obtenerConfiguracion = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!configuracion) {
            return sendResponse(res, 404, false, 'Configuración no encontrada');
        }

        const datosLimitados = req.userRole === 'administrador' || req.userRole === 'superadmin'
            ? configuracion
            : configuracion.datosPublicos();

        return sendResponse(res, 200, true, 'Configuración obtenida', datosLimitados);
    } catch (error) {
        logger.error(`Error al obtener configuración: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/configuracion/publica/:idEmpresa
 * Obtiene la configuración pública de cualquier empresa
 * Acceso: Público (sin autenticación)
 */
const obtenerConfiguracionPublica = async (req, res, next) => {
    try {
        const { idEmpresa } = req.params;

        const Empresa = require('../models/Empresa');
        const empresa = await Empresa.findOne({
            where: {
                idEmpresa,
                modoPublico: true,
                estado: 'activa',
                activo: true,
                eliminado: false
            }
        });

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada o no disponible');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa }
        });

        if (!configuracion) {
            return sendResponse(res, 404, false, 'Configuración no encontrada');
        }

        return sendResponse(res, 200, true, 'Configuración pública', configuracion.datosPublicos());
    } catch (error) {
        logger.error(`Error al obtener configuración pública: ${error.message}`);
        next(error);
    }
};

/**
 * PUT /api/configuracion
 * Actualiza la configuración completa de la empresa
 * Acceso: Solo Administrador de la empresa
 */
const actualizarConfiguracion = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!configuracion) {
            return sendResponse(res, 404, false, 'Configuración no encontrada');
        }

        const datosActualizar = sanitizarDatosActualizacion(req.body, [
            'idConfiguracion',
            'idEmpresa'
        ]);

        await configuracion.update(datosActualizar);

        logger.info(`Configuración actualizada para empresa ${req.tenantId} por usuario ${req.userId}`);

        return sendResponse(res, 200, true, 'Configuración actualizada correctamente', configuracion);
    } catch (error) {
        logger.error(`Error al actualizar configuración: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/configuracion/colores
 * Actualiza solo los colores corporativos de la empresa
 * Acceso: Solo Administrador
 */
const actualizarColores = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!configuracion) {
            return sendResponse(res, 404, false, 'Configuración no encontrada');
        }

        const camposPermitidos = {
            colorPrimario: req.body.colorPrimario,
            colorSecundario: req.body.colorSecundario,
            colorTexto: req.body.colorTexto,
            colorFondo: req.body.colorFondo,
            fuentePrincipal: req.body.fuentePrincipal
        };

        Object.keys(camposPermitidos).forEach(key => {
            if (camposPermitidos[key] === undefined) {
                delete camposPermitidos[key];
            }
        });

        if (Object.keys(camposPermitidos).length === 0) {
            return sendResponse(res, 400, false, 'No se proporcionaron campos válidos para actualizar');
        }

        await configuracion.update(camposPermitidos);

        logger.info(`Colores actualizados para empresa ${req.tenantId}`);

        return sendResponse(res, 200, true, 'Colores corporativos actualizados', {
            colorPrimario: configuracion.colorPrimario,
            colorSecundario: configuracion.colorSecundario,
            colorTexto: configuracion.colorTexto,
            colorFondo: configuracion.colorFondo,
            fuentePrincipal: configuracion.fuentePrincipal
        });
    } catch (error) {
        logger.error(`Error al actualizar colores: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/configuracion/horarios
 * Actualiza los horarios de atención de la empresa
 * Acceso: Solo Administrador
 */
const actualizarHorarios = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const { horarioAtencion } = req.body;

        const Empresa = require('../models/Empresa');
        const empresa = await Empresa.findByPk(req.tenantId);

        if (!empresa) {
            return sendResponse(res, 404, false, 'Empresa no encontrada');
        }

        await empresa.update({ horarioAtencion });

        logger.info(`Horarios actualizados para empresa ${req.tenantId}`);

        return sendResponse(res, 200, true, 'Horarios de atención actualizados', {
            horarioAtencion: empresa.horarioAtencion
        });
    } catch (error) {
        logger.error(`Error al actualizar horarios: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/configuracion/metodos-pago
 * Actualiza los métodos de pago aceptados por la empresa
 * Acceso: Solo Administrador
 */
const actualizarMetodosPago = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!configuracion) {
            return sendResponse(res, 404, false, 'Configuración no encontrada');
        }

        const camposPermitidos = {
            aceptaEfectivo: req.body.aceptaEfectivo,
            aceptaTarjetaCredito: req.body.aceptaTarjetaCredito,
            aceptaTarjetaDebito: req.body.aceptaTarjetaDebito,
            aceptaTransferencia: req.body.aceptaTransferencia,
            aceptaPse: req.body.aceptaPse,
            aceptaNequi: req.body.aceptaNequi,
            aceptaDaviplata: req.body.aceptaDaviplata,
            aceptaPayU: req.body.aceptaPayU,
            cuentasBancarias: req.body.cuentasBancarias
        };

        Object.keys(camposPermitidos).forEach(key => {
            if (camposPermitidos[key] === undefined) {
                delete camposPermitidos[key];
            }
        });

        if (Object.keys(camposPermitidos).length === 0) {
            return sendResponse(res, 400, false, 'No se proporcionaron campos válidos para actualizar');
        }

        await configuracion.update(camposPermitidos);

        logger.info(`Métodos de pago actualizados para empresa ${req.tenantId}`);

        return sendResponse(res, 200, true, 'Métodos de pago actualizados', {
            metodosActivos: configuracion.metodosPagoActivos(),
            cuentasBancarias: configuracion.cuentasBancarias
        });
    } catch (error) {
        logger.error(`Error al actualizar métodos de pago: ${error.message}`);
        next(error);
    }
};

/**
 * PATCH /api/configuracion/mantenimiento
 * Activa o desactiva el modo mantenimiento de la empresa
 * Acceso: Solo Administrador
 */
const toggleMantenimiento = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const { activar, mensaje } = req.body;

        if (typeof activar !== 'boolean') {
            return sendResponse(res, 400, false, 'El campo activar debe ser verdadero o falso');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!configuracion) {
            return sendResponse(res, 404, false, 'Configuración no encontrada');
        }

        const datosActualizar = { modoMantenimiento: activar };

        if (activar && mensaje) {
            datosActualizar.mensajeMantenimiento = mensaje;
        }

        await configuracion.update(datosActualizar);

        logger.info(
            `Modo mantenimiento ${activar ? 'activado' : 'desactivado'} 
            para empresa ${req.tenantId}
        `);

        return sendResponse(res, 200, true,
            activar
                ? 'Modo mantenimiento activado. Los clientes verán el mensaje configurado.'
                : 'Modo mantenimiento desactivado. La tienda está operativa de nuevo.',
            {
                modoMantenimiento: configuracion.modoMantenimiento,
                mensajeMantenimiento: configuracion.mensajeMantenimiento
            }
        );
    } catch (error) {
        logger.error(`Error al cambiar modo mantenimiento: ${error.message}`);
        next(error);
    }
};

/**
 * GET /api/configuracion/factura/proximo-numero
 * Obtiene el próximo número de factura que se generará
 * Acceso: Cualquier usuario autorizado (vendedores también)
 */
const obtenerProximoNumeroFactura = async (req, res, next) => {
    try {
        if (!req.tenantId) {
            return sendResponse(res, 400, false, 'Tu cuenta no está asociada a una empresa');
        }

        const configuracion = await ConfiguracionEmpresa.findOne({
            where: { idEmpresa: req.tenantId }
        });

        if (!configuracion) {
            return sendResponse(res, 404, false, 'Configuración no encontrada');
        }

        return sendResponse(res, 200, true, 'Próximo número de factura', {
            numeroFactura: configuracion.proximoNumeroFactura(),
            prefijo: configuracion.prefijoFactura,
            consecutivo: configuracion.consecutivoFactura
        });
    } catch (error) {
        logger.error(`Error al obtener próximo número de factura: ${error.message}`);
        next(error);
    }
};

module.exports = {
    obtenerConfiguracion,
    obtenerConfiguracionPublica,
    actualizarConfiguracion,
    actualizarColores,
    actualizarHorarios,
    actualizarMetodosPago,
    toggleMantenimiento,
    obtenerProximoNumeroFactura
};