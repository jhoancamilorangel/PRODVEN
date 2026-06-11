const { DataTypes } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const sequelize = require('../config/database');

const TransaccionPago = sequelize.define('TransaccionPago', {
    idTransaccion: {
        type: DataTypes.CHAR(36),
        field: 'id_transaccion',
        primaryKey: true,
        defaultValue: () => uuidv4()
    },
    idEmpresa: {
        type: DataTypes.CHAR(36),
        field: 'id_empresa',
        allowNull: false
    },
    idPago: {
        type: DataTypes.CHAR(36),
        field: 'id_pago',
        allowNull: false,
        comment: 'Pago al que pertenece esta transacción'
    },
    tipoEvento: {
        type: DataTypes.ENUM('intento', 'respuesta', 'webhook', 'reembolso', 'consulta'),
        field: 'tipo_evento',
        allowNull: false,
        comment: 'Tipo de interacción con la pasarela'
    },
    estadoResultante: {
        type: DataTypes.STRING(50),
        field: 'estado_resultante',
        allowNull: true,
        comment: 'Estado en que quedó el pago tras este evento'
    },
    codigoRespuesta: {
        type: DataTypes.STRING(50),
        field: 'codigo_respuesta',
        allowNull: true,
        comment: 'Código que devolvió PayU'
    },
    mensajeRespuesta: {
        type: DataTypes.STRING(500),
        field: 'mensaje_respuesta',
        allowNull: true
    },
    referenciaPayu: {
        type: DataTypes.STRING(150),
        field: 'referencia_payu',
        allowNull: true
    },
    orderIdPayu: {
        type: DataTypes.STRING(150),
        field: 'order_id_payu',
        allowNull: true,
        comment: 'ID de orden que asigna PayU'
    },
    transactionIdPayu: {
        type: DataTypes.STRING(150),
        field: 'transaction_id_payu',
        allowNull: true,
        comment: 'ID de transacción que asigna PayU'
    },
    monto: {
        type: DataTypes.DECIMAL(12, 2),
        field: 'monto',
        allowNull: true
    },
    datosCompletos: {
        type: DataTypes.JSON,
        field: 'datos_completos',
        allowNull: true,
        comment: 'Payload completo de la interacción para auditoría'
    },
    ipOrigen: {
        type: DataTypes.STRING(45),
        field: 'ip_origen',
        allowNull: true
    }
}, {
    tableName: 'transacciones_pago',
    timestamps: true,
    createdAt: 'fecha_creacion',
    updatedAt: false,
    underscored: true,
    indexes: [
        { fields: ['id_pago'] },
        { fields: ['id_empresa'] },
        { fields: ['referencia_payu'] },
        { fields: ['fecha_creacion'] }
    ]
});

/**
 * Devuelve los datos de la transacción para mostrar
 */
TransaccionPago.prototype.aDatosVista = function() {
    return {
        idTransaccion: this.idTransaccion,
        idPago: this.idPago,
        tipoEvento: this.tipoEvento,
        estadoResultante: this.estadoResultante,
        codigoRespuesta: this.codigoRespuesta,
        mensajeRespuesta: this.mensajeRespuesta,
        referenciaPayu: this.referenciaPayu,
        orderIdPayu: this.orderIdPayu,
        transactionIdPayu: this.transactionIdPayu,
        monto: this.monto ? parseFloat(this.monto) : null,
        ipOrigen: this.ipOrigen,
        fechaCreacion: this.fecha_creacion
    };
};

module.exports = TransaccionPago;