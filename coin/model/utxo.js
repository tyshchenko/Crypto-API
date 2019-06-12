const mongoose = require('mongoose');

function UTXO(conn) {
    this.model = conn.model('UTXO', new mongoose.Schema({
        __v: { select: false, type: Number },
        _id: { required: true, select: false, type: String },
        address: { index: true, required: true, type: String },
        blockHeight: { index: true, required: true, type: Number },
        n: { required: true, type: Number },
        txId: { required: true, type: String },
        value: { required: true, type: Number }
    }, { versionKey: false }), 'utxos');
}

module.exports.UTXO = UTXO;