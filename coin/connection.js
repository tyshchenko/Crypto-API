var settings = require('../initial/settings')
var mongoose = require('mongoose');
function Connection(coin) {
    this.name = coin;
    var dbString = 'mongodb://' + settings.dbsettings.user;
    dbString = dbString + ':' + settings.dbsettings.password;
    dbString = dbString + '@' + settings.dbsettings.address;
    dbString = dbString + ':' + settings.dbsettings.port;
    dbString = dbString + '/' + coin;
    this.connection = mongoose.createConnection(dbString)
}

module.exports.Connection = Connection;