// Constructor create new connection
var settings = require('../initial/settings');
var mongoose = require('mongoose');
function Connection(coin) {
    var dbString = 'mongodb://' + settings.dbsettings.user;
    dbString = dbString + ':' + settings.dbsettings.password;
    dbString = dbString + '@' + settings.dbsettings.address;
    dbString = dbString + ':' + settings.dbsettings.port;
    dbString = dbString + '/' + coin;
    this.connection = mongoose.createConnection(dbString);
    // this.connection.router.createUser(settings.dbsettings.user, settings.dbsettings.password);
}
module.exports.Connection = Connection;