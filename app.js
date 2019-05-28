var express = require('express')
  , path = require('path')
  , chaincoinapi = require('chaincoin-node-api')
  // , logger = require('morgan')
  , cookieParser = require('cookie-parser')
  , bodyParser = require('body-parser')
  , settings = require('./lib/settings')
  , lib = require('./lib/explorer')
  , db = require('./lib/database')
var routes = require('./routes/index')
var debug = require('debug')('explorer');
var app = express();
app.set('port', process.env.PORT || settings.port);

// for (let i of settings.coin){
//     var count = settings.coin.indexOf(i);
//     console.log(count)
//     var node = [];
//     node[count] = require('chaincoin-node-api')(i.name);
//     app.use(`/api/${i.name}`, node[count].app);
//     node[count].setWalletDetails(i.wallet);
//     node[count].setAccess('only', ['getinfo', 'getstakinginfo', 'getnetworkhashps', 'getdifficulty', 'getconnectioncount',
//         'getmasternodecount', 'getmasternodecountonline', 'getmasternodelist', 'getvotelist', 'getblockcount', 'getblockhash',
//         'getblock', 'getrawtransaction', 'getmaxmoney', 'getvote', 'getmaxvote', 'getphase', 'getreward', 'getpeerinfo',
//         'getnextrewardestimate', 'getnextrewardwhenstr', 'getnextrewardwhensec', 'getsupply', 'gettxoutsetinfo']);
// }
//
settings.coin.map(i=>{
    app.use(`/api/${i.name}`, chaincoinapi.app);
    chaincoinapi.setWalletDetails(i.wallet);
    chaincoinapi.setAccess('only', ['getinfo', 'getstakinginfo', 'getnetworkhashps', 'getdifficulty', 'getconnectioncount',
        'getmasternodecount', 'getmasternodecountonline', 'getmasternodelist', 'getvotelist', 'getblockcount', 'getblockhash',
        'getblock', 'getrawtransaction', 'getmaxmoney', 'getvote', 'getmaxvote', 'getphase', 'getreward', 'getpeerinfo',
        'getnextrewardestimate', 'getnextrewardwhenstr', 'getnextrewardwhensec', 'getsupply', 'gettxoutsetinfo']);
})

// app.use('/', routes)

// app.use(favicon(path.join(__dirname, settings.favicon)));
// app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded());
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

// Promise.all(settings.coin.map(i => {
//     db.connect(i.name).then(data =>{
//         require('./bin/instance')(data).then(()=>{})
//         routes(data).then(router => app.use(`/coin/${data.coin}`, router));
//     })
// })).then(()=>{
//     app.listen(app.get('port'), function() {
//         debug('Express server listening on port ' + settings.port);
//     });
// })

Promise.all(settings.coin.map(i => {
    return db.connect(i.name)
})).then(data => {
    data.map(i => {
        console.log(i.coin)
        require('./bin/instance')(i).then(()=>{
            // require('./scripts/sync')(i, 'update')
        })
        routes(i).then(router => app.use(`/coin/${i.coin}`, router));
    })
}).then(()=>{
    app.listen(app.get('port'), function() {
        debug('Express server listening on port ' + settings.port);
    });
})


app.use('/ext/getmoneysupply', function(req,res){
  lib.get_supply(function(supply){
    res.send(' '+supply);
  });
});
//
app.use('/ext/getaddress/:hash', function(req,res){
  db.get_address(req.param('hash'), function(address){
    if (address) {
      var a_ext = {
        address: address.a_id,
        sent: (address.sent / 100000000),
        received: (address.received / 100000000),
        balance: (address.balance / 100000000).toString().replace(/(^-+)/mg, ''),
        last_txs: address.txs,
      };
      res.send(a_ext);
    } else {
      res.send({ error: 'address not found.', hash: req.param('hash')})
    }
  });
});

app.use('/ext/getbalance/:hash', function(req,res){
  db.get_address(req.param('hash'), function(address){
    if (address) {
      res.send((address.balance / 100000000).toString().replace(/(^-+)/mg, ''));
    } else {
      res.send({ error: 'address not found.', hash: req.param('hash')})
    }
  });
});

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
//
// // development error handler
// // will print stacktrace
// if (app.get('env') === 'development') {
//     app.use(function(err, req, res, next) {
//         res.status(err.status || 500);
//         res.json('error', {
//             message: err.message,
//             error: err
//         });
//     });
// }
//
// // production error handler
// // no stacktraces leaked to user
// app.use(function(err, req, res, next) {
//     res.status(err.status || 500);
//     res.json('error', {
//         message: err.message,
//         error: {}
//     });
// });

module.exports = app;
