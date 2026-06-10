const Usuario = require('../../models/Usuario');
const empresaService = require('../shared/empresaService');
const { validarFortalezaPassword } = require('../../utils/passwordUtils');
const sequelize = require('../../config/database');
const logger = require('../../config/logger');

/**
 * Servicio de Gestión de Usuarios
 *
 * Administración del equipo de una empresa por parte del admin:
 *  - Crear empleados con rol asignado (validando límite del plan)
 *  - Editar datos y roles
 *  - Activar, desactivar y eliminar (soft delete)
 *  - Resetear contraseñas generando una temporal
 *
 * Multi-tenancy estricto y jerarquía de roles.
 * El hasheo de contraseñas lo maneja el modelo Usuario mediante hooks.
 */

const ROLES_ASIGNABLES = ['administrador', 'vendedor', 'produccion', 'supervisor', 'cliente', 'domiciliario'];

/**
 * Genera una contraseña temporal aleatoria segura de 12 caracteres
 */
const generarPasswordTemporal = () => {
    const mayusculas = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const minusculas = 'abcdefghijkmnpqrstuvwxyz';
    const numeros = '23456789';
    const especiales = '@#$%&*';

    let password = '';
    password += mayusculas[Math.floor(Math.random() * mayusculas.length)];
    password += minusculas[Math.floor(Math.random() * minusculas.length)];
    password += numeros[Math.floor(Math.random() * numeros.length)];
    password += especiales[Math.floor(Math.random() * especiales.length)];

    const todos = mayusculas + minusculas + numeros + especiales;
    for (let i = 0; i < 8; i += 1) {
        password += todos[Math.floor(Math.random() * todos.length)];
    }

    return password.split('').sort(() => Math.random() - 0.5).join('');
};

/**
 * Verifica si un rol puede ser asignado por un administrador
 */
const esRolAsignable = (rol) => {
    return ROLES_ASIGNABLES.includes(rol);
};

/**
 * Crea un nuevo usuario en la empresa del administrador
 * El hasheo de la contraseña lo hace el hook beforeCreate del modelo
 */
const crearUsuario = async (datos, idEmpresa, idCreador) => {
    const transaction = await sequelize.transaction();

    try {
        if (!esRolAsignable(datos.rol)) {
            await transaction.rollback();
            return {
                exito: false,
                usuario: null,
                mensaje: `No puedes asignar el rol "${datos.rol}". Roles permitidos: ${ROLES_ASIGNABLES.join(', ')}`
            };
        }

        const correoExistente = await Usuario.findOne({
            where: { correo: datos.correo },
            transaction
        });

        if (correoExistente) {
            await transaction.rollback();
            return {
                exito: false,
                usuario: null,
                mensaje: 'Ya existe un usuario registrado con este correo'
            };
        }

        const cantidadActual = await Usuario.count({
            where: { idEmpresa, eliminado: false },
            transaction
        });

        const limite = await empresaService.puedeCrearMasUsuarios(idEmpresa, cantidadActual);

        if (!limite.puede) {
            await transaction.rollback();
            return {
                exito: false,
                usuario: null,
                mensaje: limite.mensaje
            };
        }

        const validacion = validarFortalezaPassword(datos.password);
        if (!validacion.valida) {
            await transaction.rollback();
            return {
                exito: false,
                usuario: null,
                mensaje: validacion.errores.join('. ')
            };
        }

        const usuario = await Usuario.create({
            idEmpresa,
            nombres: datos.nombres,
            apellidos: datos.apellidos,
            correo: datos.correo,
            claveHash: datos.password,
            telefono: datos.telefono || null,
            rol: datos.rol,
            activo: true,
            verificado: true,
            debeChangarPassword: datos.debeChangarPassword || false,
            creadoPor: idCreador
        }, { transaction });

        await transaction.commit();

        logger.info(`Usuario creado: ${usuario.idUsuario} (rol: ${datos.rol}) en empresa ${idEmpresa} por ${idCreador}`);

        return {
            exito: true,
            usuario,
            mensaje: 'Usuario creado correctamente'
        };
    } catch (error) {
        await transaction.rollback();
        logger.error(`Error al crear usuario: ${error.message}`);
        throw error;
    }
};

/**
 * Actualiza los datos de un usuario de la empresa
 */
const actualizarUsuario = async (idUsuario, datos, idEmpresa) => {
    const usuario = await Usuario.findOne({
        where: { idUsuario, idEmpresa, eliminado: false }
    });

    if (!usuario) {
        return { exito: false, usuario: null, mensaje: 'Usuario no encontrado' };
    }

    if (datos.rol && !esRolAsignable(datos.rol)) {
        return {
            exito: false,
            usuario: null,
            mensaje: `No puedes asignar el rol "${datos.rol}"`
        };
    }

    if (datos.correo && datos.correo !== usuario.correo) {
        const correoExistente = await Usuario.findOne({
            where: { correo: datos.correo }
        });
        if (correoExistente) {
            return { exito: false, usuario: null, mensaje: 'Ya existe un usuario con este correo' };
        }
    }

    const camposPermitidos = ['nombres', 'apellidos', 'correo', 'telefono', 'rol'];
    for (const campo of camposPermitidos) {
        if (datos[campo] !== undefined) {
            usuario[campo] = datos[campo];
        }
    }

    await usuario.save();

    logger.info(`Usuario actualizado: ${idUsuario} en empresa ${idEmpresa}`);

    return { exito: true, usuario, mensaje: 'Usuario actualizado correctamente' };
};

/**
 * Resetea la contraseña de un usuario generando una temporal
 * El hook beforeUpdate del modelo hashea la nueva contraseña al guardar
 */
const resetearPassword = async (idUsuario, idEmpresa) => {
    const usuario = await Usuario.findOne({
        where: { idUsuario, idEmpresa, eliminado: false }
    });

    if (!usuario) {
        return { exito: false, passwordTemporal: null, mensaje: 'Usuario no encontrado' };
    }

    const passwordTemporal = generarPasswordTemporal();

    usuario.claveHash = passwordTemporal;
    usuario.debeChangarPassword = true;
    await usuario.save();

    logger.info(`Contraseña reseteada para usuario ${idUsuario} en empresa ${idEmpresa}`);

    return {
        exito: true,
        passwordTemporal,
        mensaje: 'Contraseña reseteada. Entrega la contraseña temporal al usuario.'
    };
};

/**
 * Cambia el estado activo de un usuario
 */
const cambiarEstadoActivo = async (idUsuario, activar, idEmpresa) => {
    const usuario = await Usuario.findOne({
        where: { idUsuario, idEmpresa, eliminado: false }
    });

    if (!usuario) {
        return { exito: false, usuario: null, mensaje: 'Usuario no encontrado' };
    }

    usuario.activo = activar;
    await usuario.save();

    logger.info(`Usuario ${idUsuario} ${activar ? 'activado' : 'desactivado'} en empresa ${idEmpresa}`);

    return {
        exito: true,
        usuario,
        mensaje: activar ? 'Usuario activado correctamente' : 'Usuario desactivado correctamente'
    };
};

/**
 * Elimina lógicamente un usuario (soft delete)
 */
const eliminarUsuario = async (idUsuario, idEmpresa) => {
    const usuario = await Usuario.findOne({
        where: { idUsuario, idEmpresa, eliminado: false }
    });

    if (!usuario) {
        return { exito: false, mensaje: 'Usuario no encontrado' };
    }

    usuario.eliminado = true;
    usuario.activo = false;
    await usuario.save();

    logger.info(`Usuario eliminado lógicamente: ${idUsuario} en empresa ${idEmpresa}`);

    return { exito: true, mensaje: 'Usuario eliminado correctamente' };
};

/**
 * Obtiene estadísticas del equipo de la empresa
 */
const obtenerEstadisticasEquipo = async (idEmpresa) => {
    const total = await Usuario.count({
        where: { idEmpresa, eliminado: false }
    });

    const activos = await Usuario.count({
        where: { idEmpresa, eliminado: false, activo: true }
    });

    const porRol = await Usuario.findAll({
        attributes: [
            'rol',
            [sequelize.fn('COUNT', sequelize.col('id_usuario')), 'cantidad']
        ],
        where: { idEmpresa, eliminado: false },
        group: ['rol'],
        raw: true
    });

    return {
        total,
        activos,
        inactivos: total - activos,
        porRol: porRol.reduce((acc, item) => {
            acc[item.rol] = parseInt(item.cantidad, 10);
            return acc;
        }, {})
    };
};

module.exports = {
    generarPasswordTemporal,
    esRolAsignable,
    crearUsuario,
    actualizarUsuario,
    resetearPassword,
    cambiarEstadoActivo,
    eliminarUsuario,
    obtenerEstadisticasEquipo
};