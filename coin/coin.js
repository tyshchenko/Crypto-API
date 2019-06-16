var RPC = require('./rpc/rpc');
var conn = require('./connection');
var createRouter = require('./router/createRouter');
var coin = require('./model/coin');
var block = require('./model/block');
var masternode = require('./model/masternode');
var peer = require('./model/peer');
var rich = require('./model/rich');
var tx = require('./model/tx');
var utxo = require('./model/utxo');
var blockreward = require('./model/blockreward');
var router = require('./router/createRouter');
var RPC = require('./rpc/rpc');
//Contructor create new coin object
function Coin(object) {
    this.name = object.name;
    this.connection = new conn.Connection(object.name).connection;
    this.rpc = new RPC(object.wallet);
    this.block = new block.Block(this.connection).model;
    this.coin = new coin.Coin(this.connection).model;
    this.masternode = new masternode.Masternode(this.connection).model;
    this.peer = new peer.Peer(this.connection).model;
    this.rich = new rich.Rich(this.connection).model;
    this.tx = new tx.TX(this.connection).model;
    this.utxo = new utxo.UTXO(this.connection).model;
    this.blockreward = new blockreward.BlockReward(this.connection).model;
    this.router = new router.Router(this).router;
}
module.exports.Coin = Coin;