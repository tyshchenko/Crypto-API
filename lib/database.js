var mongoose = require('mongoose')
  , Stats = require('../models/stats')
  , Address = require('../models/address')
  , Tx = require('../models/tx')
  , Richlist = require('../models/richlist')
  , Peers = require('../models/peers')
  , lib = require('./explorer')
  , settings = require('./settings');

var find_address = (conn, address) => new Promise((res, rej) => {
  var  Address_Model = Address(conn);
  Address_Model.findOne({a_id: address}, function(err, data) {
    if(data) {
      res(data);
    } else {
      res(null);
    }
  });
})
var update_address = (conn, hash, txid, amount, type) => new Promise((res, rej)=> {
  var Address_Model = Address(conn)
  find_address(conn, hash).then(address=>{
    if (address) {
      if (hash == 'coinbase') {
        Address_Model.update({a_id:hash},
            {$inc: {
              transaction: 1,
                sent: amount,
                outgoning: 1
            }}, function() {res('done')});
      } else {
        lib.is_unique(address.txs, txid).then(([unique, index]) => {
          if (unique == true) {
            if (type == 'vin') {
              Address_Model.update(
                  {a_id: hash},
                  {
                    $push: {
                      txs: {$each: {addresses: txid, type: type}, $slice: -settings.txcount}
                    }
                  },
                  {
                    $inc: {
                      transaction: 1,
                      incoming: 1,
                      sent: amount,
                      balance: -amount
                    }
                  }, () => {
                    res('done')
                  }
              )
            } else {
              Address_Model.update(
                  {a_id: hash},
                  {
                    $push: {
                      txs: {$each: {addresses: txid, type: type}, $slice: -settings.txcount}
                    }
                  },
                  {
                    $inc: {
                      transaction: 1,
                      outgoing: 1,
                      received: amount,
                      balance: amount
                    }
                  }, () => {
                    res('done')
                  }
              )
            }
          } else {
            if (type == tx_array[index].type) {
              return cb(); //duplicate
            } else {
              Address_Model.update({a_id: hash}, {
                txs: tx_array,
                received: received,
                sent: sent,
                balance: received - sent
              }, function () {
                return cb();
              });
            }
          }

        })
      }
    } else {
      //new address
      if (type == 'vin') {
        var newAddress = new Address_Model({
          a_id: hash,
          txs: [{addresses: txid, type: 'vin'}],
          sent: amount,
          // balance: amount,
          transaction: 1,
          incoming: 1,
          outgoing: 0
        });
      } else {
        var newAddress = new Address_Model({
          a_id: hash,
          txs: [{addresses: txid, type: 'vout'}],
          received: amount,
          balance: amount,
          transaction: 1,
          incomeing: 0,
          outgoing: 1
        });
      }
      newAddress.save(function (err) {
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
var find_tx = (conn, txid) => new Promise((res, rej)=> {
  var Tx_Model = Tx(conn)
  Tx_Model.findOne({txid: txid}, function(err, tx) {
    if(tx) {
      res(tx);
    } else {
      res(null);
    }
  });
})
var save_tx = (conn, coin, txid, cb) => {
    var Tx_Model = Tx(conn)
  lib.get._rawtransaction(coin, txid).then((tx)=>{
    if (tx != 'There was an error. Check your console.') {
      lib.get._block(coin, tx.blockhash).then((block)=>{
        if (block) {
          lib.prepare_vin(coin, tx, function(vin) {
            lib.prepare_vout(tx.vout, txid, vin, function(vout, nvin) {
              lib.syncLoop(vin.length, function (loop) {
                var i = loop.iteration();
                update_address(conn, nvin[i].addresses, txid, nvin[i].amount, 'vin').then(()=>{
                  loop.next();
                });
              }, function(){
                lib.syncLoop(vout.length, function (subloop) {
                  var t = subloop.iteration();
                  if (vout[t].addresses) {
                    update_address(conn, vout[t].addresses, txid, vout[t].amount, 'vout').then(()=>{
                      subloop.next();
                    });
                  } else {
                    subloop.next();
                  }
                }, function(){
                  lib.calculate_total(vout).then((total)=>{
                      // console.log(vout)
                      // console.log(total)
                    var newTx = new Tx_Model({
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
  connect: (coin) => new Promise((res, rej)=> {
      var dbString = 'mongodb://' + settings.dbsettings.user;
      dbString = dbString + ':' + settings.dbsettings.password;
      dbString = dbString + '@' + settings.dbsettings.address;
      dbString = dbString + ':' + settings.dbsettings.port;
      dbString = dbString + '/' + coin;
    var conn = mongoose.createConnection(dbString)
      conn.on('error', ()=> rej(error))
      conn.once('open', ()=>{
          res({coin: coin, conn: conn});
      });
  }),
  //CREATE, CHECK AND GET STATS AND RICHLIST---------------------------------
  fn: (type, conn, dbmodel, coin) => new Promise((res, rej) => {
      var model = require(`../models/${dbmodel}`)(conn);
      var newmodel = new model({coin: coin});
      if (type == 'create'){
          newmodel.save((err)=>{
              if(err){rej(err)}
              else {res('done')};
          });
      } else {
          model.findOne({coin: coin}, (err, stats)=>{
              if(stats){
                  if (type =='check'){res(true)}
                  else {res(stats)}
              } else {
                  if (type == 'check'){res(false)}
                  else {res(null)}
              }
          })
      }
  }),
  get_address: find_address,
  update_richlist: (conn, coin, list)=> new Promise((res, rej)=>{
    var Address_Model = Address(conn)
    var Richlist_Model = Richlist(conn)
    if(list == 'received') {
      Address_Model.find({}).sort({received: 'desc'}).limit(100).exec(function(err, addresses){
        Richlist_Model.update({coin: coin}, {
          received: addresses,
        }, function() {
          res('done');
        });
      });
    } else { //balance
      Address_Model.find({}).sort({balance: 'desc'}).limit(100).exec(function(err, addresses){
        Richlist_Model.update({coin: coin}, {
          balance: addresses,
        }, function() {
          res('done');
        });
      });
    }
  }),
//
  get_tx: find_tx,
  get_txs: (conn, block)=> new Promise((res, rej)=> {
    var txs = [];
    for (var i of block.tx){
      find_tx(conn, i).then(tx=>{
        if (tx) {
          txs.push(tx);
        } else {}
      })
      res(txs)
    }
  }),
  create_tx: (conn, coin, txid)=> new Promise((res, rej)=> {
    save_tx(conn, coin, txid, function(err){
      if (err) {
        rej(err);
      } else {
        res('done');
      }
    });
  }),
  create_txs: (conn, coin, block)=> new Promise((res, rej)=> {
    for (let i of block.tx){
      save_tx(conn, coin, i, ()=>{})
    }
    res('done')
  }),
  get_last_txs: (conn, count, min)=> new Promise((res, rej)=> {
      var Tx_Model = Tx(conn)
    Tx_Model.find({'total': {$gt: min}})
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

  get_distribution: (conn, richlist, stats) => new Promise((res, rej)=>{
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
  update_stats: (conn, coin) => new Promise((res, rej)=>{
      var Stats_Model = Stats(conn);
      Promise.all([
          lib.get._blockcount(coin),
          lib.get._supply(coin,'TXOUTSET'),
          lib.get._connectioncount(coin)
      ]).then(([
          block_height,
          supply,
          connections
      ])=>{
          lib.get._blockcount('blockshare').then((data)=>console.log('data')),
          Stats_Model.update({coin: coin},
              {$set: {
              block_height : block_height,
              supply: supply,
              connections: connections,
          }}, function() {
              res(true);
          });
      })
  }),

  // updates tx, address & richlist db's; called by sync.js
  update_tx_db: function(conn, coin, start, end, timeout, cb) {
    var Tx_Model = Tx(conn);
    var Stats_Model = Stats(conn);
    var scoin = settings.coin.find(x => x.name === coin)
    var complete = false;
    lib.syncLoop((end - start) + 1, function (loop) {
      var x = loop.iteration();
      // if (x % 5000 === 0) {
      //   Tx_Model.find({})
      //       .where('blockindex')
      //       .lt(start + x).sort({timestamp: 'desc'})
      //       .limit(scoin.index.last_txs)
      //       .exec(function(err, txs){
      //     Stats_Model.update({coin: coin}, {
      //       last: start + x - 1,
      //     }, function() {});
      //   });
      // }
      lib.get._blockhash(coin,start + x).then((blockhash) =>{
        if (blockhash) {
          lib.get._block(coin, blockhash).then((block) =>{
            if (block) {
              lib.syncLoop(block.tx.length, function (subloop) {
                var i = subloop.iteration();
                Tx_Model.findOne({txid: block.tx[i]}, function(err, tx) {
                  if(tx) {
                    tx = null;
                    subloop.next();
                  } else {
                    save_tx(conn, coin, block.tx[i], function(err){
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
      // Tx_Model.find({})
      //     .sort({timestamp: 'desc'})
      //     .limit(scoin.index.last_txs)
      //     .exec(function(err, txs){
        Stats_Model.update({coin: coin}, {
          last: end,
        }, function() {
          return cb();
        });
      // });
    });
  },

  // create_peer: function(conn, params, cb) {
  //   var Peers_Model = Peers(conn)
  //   var newPeer = new Peers_Model(params);
  //   newPeer.save(function(err) {
  //     if (err) {
  //       console.log(err);
  //       return cb();
  //     } else {
  //       return cb();
  //     }
  //   });
  // },
  //
  // find_peer: function(conn, address, cb) {
  //     var Peers_Model = Peers(conn)
  //   Peers_Model.findOne({address: address}, function(err, peer) {
  //     if (err) {
  //       return cb(null);
  //     } else {
  //       if (peer) {
  //        return cb(peer);
  //      } else {
  //        return cb (null)
  //      }
  //     }
  //   })
  // },
  //
  // get_peers: function(conn, cb) {
  //     var Peers_Model = Peers(conn)
  //   Peers_Model.find({}, function(err, peers) {
  //     if (err) {
  //       return cb([]);
  //     } else {
  //       return cb(peers);
  //     }
  //   });
  // }
};
