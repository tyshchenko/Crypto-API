var lib = require('../lib/explorer')
var db = require('../lib/database')

module.exports = (data) => {
  var coin = data.name;
  var conn = data.connection;
  lib.get._peer(coin)
      .then(body => {
        lib.syncLoop(body.length, function (loop) {
          var i = loop.iteration();
          var address = body[i].addr.split(':')[0];
          db.find_peer(address, function(peer) {
            if (peer) {
              // peer already exists
              loop.next();
            } else {
              request({uri: 'http://freegeoip.net/json/' + address, json: true}, function (error, response, geo) {
                db.create_peer({
                  address: address,
                  protocol: body[i].version,
                  version: body[i].subver.replace('/', '').replace('/', ''),
                  country: geo.country_name
                }, function(){
                  loop.next();
                });
              });
            }
          });
        }, function() {
          exit();
        });
      })
};
