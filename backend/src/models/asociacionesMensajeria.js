const Conversacion = require('./Conversacion');
const Mensaje = require('./Mensaje');
const ParticipanteConversacion = require('./ParticipanteConversacion');
const Usuario = require('./Usuario'); 

// =====================================================
// DEFINICIÓN DE RELACIONES (ASOCIACIONES) DE MENSAJERÍA
// =====================================================

// 1. Relaciones entre Conversación y Mensaje
Conversacion.hasMany(Mensaje, { 
    foreignKey: 'idConversacion', 
    as: 'mensajes' 
});
Mensaje.belongsTo(Conversacion, { 
    foreignKey: 'idConversacion', 
    as: 'conversacion' 
});

// 2. Relaciones entre Conversación y Participante
Conversacion.hasMany(ParticipanteConversacion, { 
    foreignKey: 'idConversacion', 
    as: 'participantes' 
});
ParticipanteConversacion.belongsTo(Conversacion, { 
    foreignKey: 'idConversacion', 
    as: 'conversacion' 
});

// 3. Relaciones entre Usuario y Mensaje
Mensaje.belongsTo(Usuario, { 
    foreignKey: 'idRemitente', 
    as: 'remitente' 
});
Usuario.hasMany(Mensaje, { 
    foreignKey: 'idRemitente', 
    as: 'mensajesEnviados' 
});

// 4. Relaciones entre Usuario y Participante
ParticipanteConversacion.belongsTo(Usuario, { 
    foreignKey: 'idUsuario', 
    as: 'usuarioDetalle' 
});
Usuario.hasMany(ParticipanteConversacion, { 
    foreignKey: 'idUsuario', 
    as: 'conversacionesParticipa' 
});

module.exports = {
    Conversacion,
    Mensaje,
    ParticipanteConversacion
};