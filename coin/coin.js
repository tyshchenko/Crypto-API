var bitcoin = require('bitcoin');
var clientRouter = require('./routes/clientRouter');
var dbRouter = require('./routes/dbRouter');
var db = require('../lib/database')
var conn = require('./connection');

function Coin(object) {
    this.name = object.name;
    this.connection = new conn.Connection(object.name);
    this.client = new bitcoin.Client(object.wallet);
    this.clientRouter = clientRouter(this.client);
    this.dbRouter = dbRouter(this.connection);
}

module.exports.Coin = Coin;