var express = require('express')
  // , path = require('path')
  , coin = require('./coin/coin')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , settings = require('./initial/settings')
  , lib = require('./lib/explorer')
  , db = require('./lib/database')
// var array = require('./initial/index');
var debug = require('debug')('explorer');
var app = express();
app.set('port', process.env.PORT || settings.port);
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
var arrayOfCoin = require('./coin/arrayOfCoin')
// var arrayOfCoin = array.map(i => {return new coin.Coin(require(`./initial/${i}`))});
Promise.all(arrayOfCoin.map(coin =>{
    console.log(coin.name)
    app.use(`/api/${coin.name}`, coin.clientRouter);
    app.use(`/coin/${coin.name}`, coin.dbRouter);
    require('./scripts/instance')(coin.connection)
})).then(()=>{
    app.listen(app.get('port'), function() {
        debug('Express server listening on port ' + settings.port);
    });
})

// app.use('/ext/getmoneysupply', function(req,res){
//   lib.get_supply(function(supply){
//     res.send(' '+supply);
//   });
// });
// //
// app.use('/ext/getaddress/:hash', function(req,res){
//   router.get_address(req.param('hash'), function(address){
//     if (address) {
//       var a_ext = {
//         address: address.a_id,
//         sent: (address.sent / 100000000),
//         received: (address.received / 100000000),
//         balance: (address.balance / 100000000).toString().replace(/(^-+)/mg, ''),
//         last_txs: address.txs,
//       };
//       res.send(a_ext);
//     } else {
//       res.send({ error: 'address not found.', hash: req.param('hash')})
//     }
//   });
// });
//
// app.use('/ext/getbalance/:hash', function(req,res){
//   router.get_address(req.param('hash'), function(address){
//     if (address) {
//       res.send((address.balance / 100000000).toString().replace(/(^-+)/mg, ''));
//     } else {
//       res.send({ error: 'address not found.', hash: req.param('hash')})
//     }
//   });
// });

app.use('/ext/getdistribution', function(req,res){
  db.get_richlist(settings.coin, function(richlist){
    db.get_stats(settings.coin, function(stats){
      db.get_distribution(richlist, stats, function(dist){
        res.send(dist);
      });
    });
  });
});

app.use('/ext/getlasttxs/:min', function(req,res){
  db.get_last_txs(settings.index.last_txs, (req.params.min * 100000000), function(txs){
    res.send({data: txs});
  });
});

app.use('/ext/connections', function(req,res){
  db.get_peers(function(peers){
    res.send({data: peers});
  });
});

// app.use(function(req, res, next) {
//     var err = new Error('Not Found');
//     err.status = 404;
//     next(err);
// });
// if (app.get('env') === 'development') {
//     app.use(function(err, req, res, next) {
//         res.status(err.status || 500);
//         res.json('error', {
//             message: err.message,
//             error: err
//         });
//     });
// }
// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.json('error', {
//         message: err.message,
//         error: {}
//     });
// });

