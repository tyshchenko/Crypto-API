var coin = require('./coin');
var array = require('../initial/index');
var arrayOfCoin = array.map(i => {
    return new coin.Coin(require(`../initial/${i}`));
});
module.exports = arrayOfCoin;