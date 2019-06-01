var RPC = require('../lib/rpc');
var conn = require('./connection');
var createRouter = require('./router/createRouter');
//Contructor create new coin object
function Coin(object) {
    this.name = object.name;
    this.connection = new conn.Connection(object.name).connection;
    this.rpc = new RPC(object.wallet);
    this.block = require('./model/block')(this.connection);
    this.coin = require('./model/coin')(this.connection);
    this.masternode = require('./model/masternode')(this.connection);
    this.peer = require('./model/peer')(this.connection);
    this.rich = require('./model/rich')(this.connection);
    this.tx = require('./model/tx')(this.connection);
    this.utxo = require('./model/utxo')(this.connection);
    this.router = createRouter(this);
}

module.exports.Coin = Coin;