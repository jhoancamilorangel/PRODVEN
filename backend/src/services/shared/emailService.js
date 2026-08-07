const logger = require('../../config/logger');

/**
 * Verifica la conexión simulando una llamada exitosa 
 * (La API no requiere mantener una conexión abierta como SMTP)
 */
const verificarConexionEmail = async () => {
    try {
        if (!process.env.BREVO_API_KEY) {
            logger.error('Error al conectar servicio de correo: Falta BREVO_API_KEY en el archivo .env');
            return false;
        }
        logger.info('Servicio de correo (Brevo API) inicializado correctamente');
        return true;
    } catch (error) {
        logger.error(`Error al conectar servicio de correo: ${error.message}`);
        return false;
    }
};

/**
 * Envía un correo electrónico haciendo una petición HTTP POST a la API de Brevo
 * @param {object} datos - Destinatario, asunto y contenido HTML
 */
const enviarCorreo = async ({ para, asunto, html }) => {
    const url = 'https://api.brevo.com/v3/smtp/email';
    
    const datosCorreo = { 
        sender: { 
            name: process.env.EMAIL_FROM_NAME || 'ProdVen', 
            email: process.env.EMAIL_USER 
        }, 
        to: [{ email: para }],
        subject: asunto,
        htmlContent: html
    };

    try {
        // fetch está disponible de forma nativa en Node.js 18 o superior
        const respuesta = await fetch(url, {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'api-key': process.env.BREVO_API_KEY
            },
            body: JSON.stringify(datosCorreo)
        });

        if (!respuesta.ok) {
            const datosError = await respuesta.json();
            throw new Error(`Respuesta de Brevo: ${JSON.stringify(datosError)}`);
        }

        const datosExito = await respuesta.json();
        logger.info(`Correo enviado por API a ${para}: ${datosExito.messageId || 'Éxito'}`);
        return datosExito;

    } catch (error) {
        logger.error(`Error al enviar correo por API a ${para}: ${error.message}`);
        throw new Error('No se pudo enviar el correo');
    }
};

/**
 * Envía el correo de verificación al registrarse un usuario
 */
const enviarCorreoVerificacion = async (correo, nombres, codigo) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #0A2A43; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #FFFFFF; margin: 0;">ProdVen</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #0A2A43;">Hola ${nombres},</h2>
                <p>Bienvenido a ProdVen. Para activar tu cuenta usa el siguiente código de verificación:</p>
                <div style="background-color: #FFFFFF; border: 2px solid #27AE60; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #27AE60; letter-spacing: 8px; margin: 0;">${codigo}</h1>
                </div>
                <p>Este código expira en 15 minutos.</p>
                <p style="color: #666; font-size: 12px;">Si no solicitaste este registro, ignora este correo.</p>
            </div>
        </div>
    `;

    return await enviarCorreo({
        para: correo,
        asunto: 'Verifica tu cuenta en ProdVen',
        html
    });
};

/**
 * Envía el código 2FA cuando el usuario inicia sesión
 */
const enviarCodigo2FA = async (correo, nombres, codigo) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #0A2A43; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #FFFFFF; margin: 0;">ProdVen</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #0A2A43;">Hola ${nombres},</h2>
                <p>Tu código de verificación de dos factores es:</p>
                <div style="background-color: #FFFFFF; border: 2px solid #27AE60; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #27AE60; letter-spacing: 8px; margin: 0;">${codigo}</h1>
                </div>
                <p>Este código expira en 5 minutos.</p>
                <p style="color: #666; font-size: 12px;">Si no intentaste iniciar sesión, cambia tu contraseña inmediatamente.</p>
            </div>
        </div>
    `;

    return await enviarCorreo({
        para: correo,
        asunto: 'Código de verificación ProdVen',
        html
    });
};

/**
 * Envía el correo de recuperación de contraseña
 */
const enviarCorreoRecuperacion = async (correo, nombres, codigo) => {
    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background-color: #0A2A43; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
                <h1 style="color: #FFFFFF; margin: 0;">ProdVen</h1>
            </div>
            <div style="background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
                <h2 style="color: #0A2A43;">Hola ${nombres},</h2>
                <p>Recibimos una solicitud para restablecer tu contraseña. Tu código es:</p>
                <div style="background-color: #FFFFFF; border: 2px solid #27AE60; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
                    <h1 style="color: #27AE60; letter-spacing: 8px; margin: 0;">${codigo}</h1>
                </div>
                <p>Este código expira en 30 minutos.</p>
                <p style="color: #666; font-size: 12px;">Si no solicitaste el cambio, ignora este correo y tu contraseña seguirá intacta.</p>
            </div>
        </div>
    `;

    return await enviarCorreo({
        para: correo,
        asunto: 'Recuperar contraseña ProdVen',
        html
    });
};

module.exports = {
    verificarConexionEmail,
    enviarCorreo,
    enviarCorreoVerificacion,
    enviarCodigo2FA,
    enviarCorreoRecuperacion
};