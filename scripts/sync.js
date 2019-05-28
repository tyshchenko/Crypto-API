var mongoose = require('mongoose')
  , db = require('../lib/database')
  , Tx = require('../models/tx')  
  , Address = require('../models/address')  
  , Richlist = require('../models/richlist')  
  , Stats = require('../models/stats')  
  , settings = require('../lib/settings')
  , fs = require('fs');

var mode = 'update';
var database = 'index';

// displays usage and exits
function usage() {
  console.log('Usage: node scripts/sync.js [database] [mode]');
  console.log('');
  console.log('database: (required)');
  console.log('index [mode] Main index: coin info/stats, transactions & addresses');
  console.log('market       Market data: summaries, orderbooks, trade history & chartdata')
  console.log('');
  console.log('mode: (required for index database only)');
  console.log('update       Updates index from last sync to current block');
  console.log('check        checks index for (and adds) any missing transactions/addresses');
  console.log('reindex      Clears index then resyncs from genesis to current block');
  console.log('');
  console.log('notes:');
  console.log('* \'current block\' is the latest created block when script is executed.');
  console.log('* The market database only supports (& defaults to) reindex mode.');
  console.log('* If check mode finds missing data(ignoring new data since last sync),');
  console.log('  index_timeout in settings.json is set too low.')
  console.log('');
  process.exit(0);
}

// check options
if (process.argv[2] == 'index') {
  if (process.argv.length <3) {
    usage();
  } else {
    switch(process.argv[3])
    {
    case 'update':
      mode = 'update';
      break;
    case 'check':
      mode = 'check';
      break;
    case 'reindex':
      mode = 'reindex';
      break;
    default:
      usage();
    }
  }
} else if (process.argv[2] == 'market'){
  database = 'market';
} else {
  usage();
}

function create_lock(cb) {
  if ( database == 'index' ) {
    var fname = './tmp/' + database + '.pid';
    fs.appendFile(fname, process.pid, function (err) {
      if (err) {
        console.log("Error: unable to create %s", fname);
        process.exit(1);
      } else {
        return cb();
      }
    });
  } else {
    return cb();
  }
}

function remove_lock(cb) {
  if ( database == 'index' ) {
    var fname = './tmp/' + database + '.pid';
    fs.unlink(fname, function (err){
      if(err) {
        console.log("unable to remove lock: %s", fname);
        process.exit(1);
      } else {
        return cb();
      }
    });
  } else {
    return cb();
  }  
}

function is_locked(cb) {
  if ( database == 'index' ) {
    var fname = './tmp/' + database + '.pid';
    fs.exists(fname, function (exists){
      if(exists) {
        return cb(true);
      } else {
        return cb(false);
      }
    });
  } else {
    return cb();
  } 
}

function exit() {
  remove_lock(function(){
    // mongoose.disconnect();
    process.exit(0);
  });
}
//
// module.exports = (data, mode) => {
//     var coin = data.coin
//     var conn = data.conn
//     var i = settings.coin.find(x => x.name ===coin);
//     is_locked(function (exists) {
//         if (exists) {
//             console.log("Script already running..");
//             process.exit(0);
//         } else {
//             create_lock(function (){
//                 console.log("script launched with pid: " + process.pid);
//                 db.fn('check', conn, 'stats', coin).then((exists) =>{
//                     if (exists == false) {
//                         console.log('Run \'npm start\' to create database structures before running this script.');
//                         exit();
//                     } else {
//                         db.update_stats(conn, coin).then(()=>{
//                             db.fn('get', conn, 'stats', coin).then((stats)=>{
//                                 if (mode == 'reindex') {
//                                     var Stats_Model = Stats(conn)
//                                     var Tx_Model = Tx(conn);
//                                     var Address_Model = Address(conn);
//                                     var Richlist_Model = Richlist(conn)
//                                     Tx_Model.remove({}, function(err) {
//                                         Address_Model.remove({}, function(err2) {
//                                             Richlist_Model.update({coin: coin},
//                                                 {$set: {
//                                                         received: [],
//                                                         balance: [],
//                                                     }}, function(err3) {
//                                                     Stats_Model.update({coin: coin},
//                                                         {$set: {
//                                                                 last: 0,
//                                                             }}, function() {
//                                                             console.log('index cleared (reindex)');
//                                                         });
//                                                     db.update_tx_db(conn, coin, 1, stats.block_height, i.update_timeout, function(){
//                                                         db.update_richlist(conn, coin,'received').then(()=>{
//                                                             db.update_richlist(conn, coin,'balance').then(()=>{
//                                                                 console.log('reindex complete (block: %s)', stats.block_height);
//                                                                 exit();
//                                                             });
//                                                         });
//                                                     });
//                                                 });
//                                         });
//                                     });
//                                 } else if (mode == 'check') {
//                                     db.update_tx_db(conn, coin, 1, stats.block_height, i.check_timeout, function(){
//                                         console.log('check complete (block: %s)', stats.last);
//                                         exit();
//                                     });
//                                 } else if (mode == 'update') {
//                                     db.update_tx_db(conn, coin, stats.last, stats.block_height, i.update_timeout, function(){
//                                         db.update_richlist(conn, coin,'received').then(()=>{
//                                             db.update_richlist(conn, coin,'balance').then(()=>{
//                                                 console.log('update complete (block: %s)', stats.last);
//                                                 exit();
//                                             });
//                                         });
//                                     });
//                                 } else {
//                                     exit();
//                                 }
//                             });
//                         });
//                     }
//                 });
//             });
//         }
//     });
// }
is_locked(function (exists) {
  if (exists) {
    console.log("Script already running..");
    process.exit(0);
  } else {
    create_lock(function (){
      console.log("script launched with pid: " + process.pid);
      Promise.all(settings.coin.map(i => {
        return db.connect(i.name)
      })).then((data)=>{
          data.map(i=>{
              var coin = i.coin
              var conn = i.conn;
              console.log(conn.name)
              // console.log(coin)
              if (database == 'index') {
                  db.fn('check', conn, 'stats', coin).then((exists) =>{
                      if (exists == false) {
                          console.log('Run \'npm start\' to create database structures before running this script.');
                          exit();
                      } else {
                          db.update_stats(conn, coin).then(()=>{
                              db.fn('get', conn, 'stats', coin).then((stats)=>{
                                  if (mode == 'reindex') {
                                      var Stats_Model = Stats(conn)
                                      var Tx_Model = Tx(conn);
                                      var Address_Model = Address(conn);
                                      var Richlist_Model = Richlist(conn)
                                      Tx_Model.remove({}, function(err) {
                                          Address_Model.remove({}, function(err2) {
                                              Richlist_Model.update({coin: coin},
                                                  {$set: {
                                                          received: [],
                                                          balance: [],
                                                      }}, function(err3) {
                                                      Stats_Model.update({coin: coin},
                                                          {$set: {
                                                                  last: 0,
                                                              }}, function() {
                                                              console.log('index cleared (reindex)');
                                                          });
                                                      db.update_tx_db(conn, coin, 1, stats.block_height, i.update_timeout, function(){
                                                          db.update_richlist(conn, coin,'received').then(()=>{
                                                              db.update_richlist(conn, coin,'balance').then(()=>{
                                                                  console.log('reindex complete (block: %s)', stats.block_height);
                                                                  exit();
                                                              });
                                                          });
                                                      });
                                                  });
                                          });
                                      });
                                  } else if (mode == 'check') {
                                      db.update_tx_db(conn, coin, 1, stats.block_height, i.check_timeout, function(){
                                          console.log('check complete (block: %s)', stats.last);
                                          exit();
                                      });
                                  } else if (mode == 'update') {
                                      db.update_tx_db(conn, coin, stats.last, stats.block_height, i.update_timeout, function(){
                                          db.update_richlist(conn, coin,'received').then(()=>{
                                              db.update_richlist(conn, coin,'balance').then(()=>{
                                                  console.log('update complete (block: %s)', stats.last);
                                                  exit();
                                              });
                                          });
                                      });
                                  } else {
                                      exit();
                                  }
                              });
                          });
                      }
                  });
              }
          })
      })
    });
  }
});