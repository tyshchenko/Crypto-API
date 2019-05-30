var array = require('../initial/index');
var coin = require('./coin');

module.exports = array.map(i => {return new coin.Coin(require(`../initial/${i}`))});