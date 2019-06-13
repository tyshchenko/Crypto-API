// Constructor create new connection
var settings = require('../initial/settings');
var mongoose = require('mongoose');
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
function Connection(coin) {
    var dbString = 'mongodb://' + settings.dbsettings.user;
    dbString = dbString + ':' + settings.dbsettings.password;
    dbString = dbString + '@' + settings.dbsettings.address;
    dbString = dbString + ':' + settings.dbsettings.port;
    dbString = dbString + '/' + coin;
    this.connection = mongoose.createConnection(dbString);
}
module.exports.Connection = Connection;