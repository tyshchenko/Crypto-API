var mongoose = require('mongoose')
  , Stats = require('../models/stats')
  , Address = require('../models/address')
  , Tx = require('../models/tx')
  , Richlist = require('../models/richlist')
  , Peers = require('../models/peers')
  , lib = require('./explorer')
  , settings = require('./settings');

var find_address = (address) => new Promise((res, rej) => {
  Address.findOne({a_id: address}, function(err, data) {
    if(data) {
      res(data);
    } else {
      res(null);
    }
  });
})
//
var find_richlist = (coin) => new Promise((res, rej)=> {
  Richlist.findOne({coin: coin}, function(err, data) {
    if(data) {
      res(data);
    } else {
      rej(err);
    }
  });
})
//
var update_address = (hash, txid, amount, type) => new Promise((res, rej)=> {
  find_address(hash).then(address=>{
    if (address) {
        console.log('address null')
      if (hash == 'coinbase') {
        Address.update({a_id:hash},
            {$set: {
          sent: address.sent + amount,
        }}, function() {res('done')});
      } else {
        // ensure tx doesnt already exist in address.txs
        lib.is_unique(address.txs, txid).then(([unique, index]) => {
          var tx_array = address.txs;
          var received = address.received;
          var sent = address.sent;
          var incoming = address.incoming;
          var outgoing = address.outgoing;
          var transaction = address.transaction;
          if (type == 'vin') {
            transaction = transaction + 1;
            incoming = incoming + 1;
            sent = sent + amount;
          } else {
            transaction = transaction + 1;
            outgoing = outgoing + 1;
            received = received + amount;
          }
          if (unique == true) {
            tx_array.push({addresses: txid, type: type});
            if ( tx_array.length > settings.txcount ) {
              tx_array.shift();
            }
            Address.update({a_id:hash},
                {$set: {
              transaction: transaction,
              incoming: incoming,
              outgoing: outgoing,
              txs: tx_array,
              received: received,
              sent: sent,
              balance: received - sent
            }}, function() {
              res('done');
            });
          } else {
            if (type == tx_array[index].type) {
              res('done'); //duplicate
            } else {
              Address.update({a_id:hash},
                  {$set: {
                txs: tx_array,
                received: received,
                sent: sent,
                balance: received - sent
              }}, function() {
                res('done');
              });
            }
          }
        });
      }
    } else {
      //new address
      if (type == 'vin') {
        var newAddress = new Address({
          a_id: hash,
          txs: [ {addresses: txid, type: 'vin'} ],
          sent: amount,
          balance: amount,
          transaction: 1,
          incoming: 1,
          outgoing: 0
        });
      } else {
        var newAddress = new Address({
          a_id: hash,
          txs: [ {addresses: txid, type: 'vout'} ],
          received: amount,
          balance: amount,
          transaction: 1,
          incoming: 0
        });
      }
      newAddress.save(function(err) {
        if (err) {
          rej(err);
        } else {
          res('done');
        }
      });
    }
  })
})
//
var find_tx = (txid) => new Promise((res, rej)=> {
  Tx.findOne({txid: txid}, function(err, tx) {
    if(tx) {
      res(tx);
    } else {
      res(null);
    }
  });
})
var save_tx = (txid, cb) => {
  lib.get._rawtransaction(txid).then((tx)=>{
    if (tx != 'There was an error. Check your console.') {
      lib.get._block(tx.blockhash).then((block)=>{
        if (block) {
          lib.prepare_vin(tx, function(vin) {
            lib.prepare_vout(tx.vout, txid, vin, function(vout, nvin) {
              lib.syncLoop(vin.length, function (loop) {
                var i = loop.iteration();
                update_address(nvin[i].addresses, txid, nvin[i].amount, 'vin').then(()=>{
                  loop.next();
                });
              }, function(){
                lib.syncLoop(vout.length, function (subloop) {
                  var t = subloop.iteration();
                  if (vout[t].addresses) {
                    update_address(vout[t].addresses, txid, vout[t].amount, 'vout').then(()=>{
                      subloop.next();
                    });
                  } else {
                    subloop.next();
                  }
                }, function(){
                  lib.calculate_total(vout).then((total)=>{
                      // console.log(vout)
                      // console.log(total)
                    var newTx = new Tx({
                      txid: tx.txid,
                      vin: nvin,
                      vout: vout,
                      total: total.toFixed(8),
                      timestamp: tx.time,
                      blockhash: tx.blockhash,
                      blockindex: block.height,
                    });
                    newTx.save(function(err) {
                        console.log('save')
                      if (err) {
                        return cb(err);
                      } else {
                        console.log('txid: ');
                        return cb();
                      }
                    });
                  });
                });
              });
            });
          });
        } else {
          return cb('block not found: ' + tx.blockhash);
        }
      });
    } else {
      return cb('tx not found: ' + txid);
    }
  });
}
//
module.exports = {
  connect: (database) => new Promise((res, rej)=> {
    mongoose.connect(database, function(err) {
      if (err) {
        console.log('Unable to connect to database: %s', database);
        console.log('Aborting');
        process.exit(1);
      }
      res('done');
    });
  }),
//
  check_stats: (coin)=> new Promise((res, rej)=> {
    Stats.findOne({coin: coin}, function(err, stats) {
      if(stats) {
        res(true);
      } else {
        res(false);
      }
    });
  }),
//
  get_stats: (coin) => new Promise((res, rej)=> {
    Stats.findOne({coin: coin}, function(err, stats) {
      if(stats) {
        res(stats._doc);
      } else {
        res(null);
      }
    });
  }),
//
  create_stats: (coin) => new Promise((res, rej)=> {
    var newStats = new Stats({
      coin: coin,
    });

    newStats.save(function(err) {
      if (err) {
        console.log(err);
        rej(err);
      } else {
        console.log("initial stats entry created for %s", coin);
        //console.log(newStats);
        res('done');
      }
    });
  }),
//
  get_address: find_address,
  get_richlist: find_richlist,
  update_richlist: (list)=> new Promise((res, rej)=>{
    if(list == 'received') {
      Address.find({}).sort({received: 'desc'}).limit(100).exec(function(err, addresses){
        Richlist.update({coin: settings.coin}, {
          received: addresses,
        }, function() {
          res('done');
        });
      });
    } else { //balance
      Address.find({}).sort({balance: 'desc'}).limit(100).exec(function(err, addresses){
        Richlist.update({coin: settings.coin}, {
          balance: addresses,
        }, function() {
          res('done');
        });
      });
    }
  }),
//
  get_tx: find_tx,
  get_txs: (block)=> new Promise((res, rej)=> {
    var txs = [];
    for (var i of block.tx){
      find_tx(i).then(tx=>{
        if (tx) {
          txs.push(tx);
        } else {}
      })
      res(txs)
    }
  }),
//
  create_tx: (txid)=> new Promise((res, rej)=> {
    save_tx(txid, function(err){
      if (err) {
        rej(err);
      } else {
        res('done');
      }
    });
  }),

  create_txs: (block)=> new Promise((res, rej)=> {
    for (let i of block.tx){
      save_tx(i).then(data=>{})
    }
    res('done')
  }),

  get_last_txs: (count, min)=> new Promise((res, rej)=> {
    Tx.find({'total': {$gt: min}})
        .sort({_id: 'desc'})
        .limit(count)
        .exec(function(err, txs){
          if (err) {
            rej(err);
          } else {
            res(txs);
          }
    });
  }),

  // creates initial richlist entry in database; called on first launch of explorer
  create_richlist: (coin)=> new Promise((res, rej)=> {
    var newRichlist = new Richlist({
      coin: coin,
    });
    newRichlist.save(function(err) {
      if (err) {
        console.log(err);
        rej(err);
      } else {
        console.log("initial richlist entry created for %s", coin);
        res('done');
      }
    });
  }),
  // checks richlist data exists for given coin
  check_richlist: (coin) => new Promise((res, rej)=> {
    Richlist.findOne({coin: coin}, function(err, exists) {
      if(exists) {
        res(true);
      } else {
        res(false);
      }
    });
  }),

  get_distribution: (richlist, stats) => new Promise((res, rej)=>{
    var distribution = {
      supply: stats.supply,
      t_1_25: {percent: 0, total: 0 },
      t_26_50: {percent: 0, total: 0 },
      t_51_75: {percent: 0, total: 0 },
      t_76_100: {percent: 0, total: 0 },
      t_101plus: {percent: 0, total: 0 }
    };
    for (let i of richlist.balance){
      var count = 0;
      var percentage = ((i.balance / 100000000) / stats.supply) * 100;
      if (count <= 25 ) {
        distribution.t_1_25.percent += percentage;
        distribution.t_1_25.total += (i.balance / 100000000);
      }
      if (count <= 50 && count > 25) {
        distribution.t_26_50.percent += percentage;
        distribution.t_26_50.total += (i.balance / 100000000);
      }
      if (count <= 75 && count > 50) {
        distribution.t_51_75.percent += percentage;
        distribution.t_51_75.total += (i.balance / 100000000);
      }
      if (count <= 100 && count > 75) {
        distribution.t_76_100.percent += percentage;
        distribution.t_76_100.total += (i.balance / 100000000);
      }
    }
    distribution.t_101plus.percent = parseFloat(100 - distribution.t_76_100.percent - distribution.t_51_75.percent - distribution.t_26_50.percent - distribution.t_1_25.percent).toFixed(2);
    distribution.t_101plus.total = parseFloat(distribution.supply - distribution.t_76_100.total - distribution.t_51_75.total - distribution.t_26_50.total - distribution.t_1_25.total).toFixed(8);
    distribution.t_1_25.percent = parseFloat(distribution.t_1_25.percent).toFixed(2);
    distribution.t_1_25.total = parseFloat(distribution.t_1_25.total).toFixed(8);
    distribution.t_26_50.percent = parseFloat(distribution.t_26_50.percent).toFixed(2);
    distribution.t_26_50.total = parseFloat(distribution.t_26_50.total).toFixed(8);
    distribution.t_51_75.percent = parseFloat(distribution.t_51_75.percent).toFixed(2);
    distribution.t_51_75.total = parseFloat(distribution.t_51_75.total).toFixed(8);
    distribution.t_76_100.percent = parseFloat(distribution.t_76_100.percent).toFixed(2);
    distribution.t_76_100.total = parseFloat(distribution.t_76_100.total).toFixed(8);
    res(distribution)
  }),

  // updates stats data for given coin; called by sync.js
  update_db: (coin) => new Promise((res, rej)=>{
      Promise.all([
          lib.get._blockcount(),
          lib.get_supply('TXOUTSET'),
          lib.get._connectioncount()
      ]).then(([
          block_height,
          supply,
          connections
      ])=>{
          Stats.update({coin: coin},
              {$set: {
              block_height : block_height,
              supply: supply,
              connections: connections,
          }}, function() {
              res(true);
          });
      })
    // lib.get._blockcount().then((block_height)=> {
    //     // console.log(block_height)
    //   if (!block_height){
    //     console.log('Unable to connect to explorer API');
    //     res(false);
    //   }
    //   lib.get_supply('TXOUTSET').then((supply)=>{
    //       // console.log(supply)
    //     lib.get._connectioncount().then((connections)=> {
    //         console.log(connections)
    //       Stats.update({coin: coin}, {
    //         coin: coin,
    //         block_height : block_height,
    //         supply: supply,
    //         connections: connections,
    //       }, function() {
    //           console.log('aaaa')
    //         res(true);
    //       });
    //     });
    //   });
    // });
  }),

  // updates tx, address & richlist db's; called by sync.js
  update_tx_db: function(coin, start, end, timeout, cb) {
    var complete = false;
    lib.syncLoop((end - start) + 1, function (loop) {
      var x = loop.iteration();
      if (x % 5000 === 0) {
        Tx.find({})
            .where('blockindex')
            .lt(start + x).sort({timestamp: 'desc'})
            .limit(settings.index.last_txs)
            .exec(function(err, txs){
          Stats.update({coin: coin}, {
            last: start + x - 1,
          }, function() {});
        });
      }
      lib.get._blockhash(start + x).then((blockhash) =>{
        if (blockhash) {
          lib.get._block(blockhash).then((block) =>{
            if (block) {
              lib.syncLoop(block.tx.length, function (subloop) {
                var i = subloop.iteration();
                Tx.findOne({txid: block.tx[i]}, function(err, tx) {
                  if(tx) {
                    tx = null;
                    subloop.next();
                  } else {
                      // console.log(i)
                      // console.log(block.tx[i])
                    save_tx(block.tx[i], function(err){
                      if (err) {
                        console.log(err);
                      } else {
                        console.log('%s: %s', block.height, block.tx[i]);
                      }
                      setTimeout( function(){
                        tx = null;
                        subloop.next();
                      }, timeout);
                    });
                  }
                });
              }, function(){
                blockhash = null;
                block = null;
                loop.next();
              });
            } else {
              console.log('block not found: %s', blockhash);
              loop.next();
            }
          });
        } else {
          loop.next();
        }
      });
    }, function(){
      Tx.find({})
          .sort({timestamp: 'desc'})
          .limit(settings.index.last_txs)
          .exec(function(err, txs){
        Stats.update({coin: coin}, {
          last: end,
        }, function() {
          return cb();
        });
      });
    });
  },

  create_peer: function(params, cb) {
    var newPeer = new Peers(params);
    newPeer.save(function(err) {
      if (err) {
        console.log(err);
        return cb();
      } else {
        return cb();
      }
    });
  },

  find_peer: function(address, cb) {
    Peers.findOne({address: address}, function(err, peer) {
      if (err) {
        return cb(null);
      } else {
        if (peer) {
         return cb(peer);
       } else {
         return cb (null)
       }
      }
    })
  },

  get_peers: function(cb) {
    Peers.find({}, function(err, peers) {
      if (err) {
        return cb([]);
      } else {
        return cb(peers);
      }
    });
  }
};
