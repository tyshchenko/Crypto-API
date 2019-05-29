var express = require('express')
var settings = require('../../lib/settings')
var db = require('../../lib/database')
var lib = require('../../lib/explorer')

function route_get_block(conn, res, coin, blockhash) {
    var settings = require(`../../initial/${coin}`);
    lib.get._block(coin, blockhash).then((block) =>{
        if (block != 'There was an error. Check your console.') {
            if (blockhash == settings.genesis_block) {
                res.status(200).json({block: block, txs: 'GENESIS'});
            } else {
                db.get_txs(conn, block).then((txs) =>{
                    if (txs.length > 0) {
                        res.status(200).json({txs: txs});
                    } else {
                        db.create_txs(conn, coin, block).then(()=>{
                            db.get_txs(conn, block).then((ntxs) =>{
                                if (ntxs.length > 0) {
                                    res.status(200).json({ txs: ntxs});
                                } else {
                                    res.status(404).send('Block not found!')
                                }
                            });
                        });
                    }
                });
            }
        } else {
            res.status(404).send('Block not found!')
        }
    });
}
function route_get_tx(conn, res, coin, txid) {
    db.get_tx(conn, txid).then((tx) =>{
        if (tx) {
            lib.get._blockcount(coin).then((blockcount) =>{
                res.status(200).json({tx: tx, blockcount: blockcount});
            });
        }
        else {
            lib.get._rawtransaction(coin, txid).then((rtx) =>{
                if (rtx.txid) {
                    lib.prepare_vin(coin, rtx, function(vin) {
                        lib.prepare_vout(rtx.vout, rtx.txid, vin, function(rvout, rvin) {
                            lib.calculate_total(rvout).then((total)=>{
                                if (!rtx.confirmations > 0) {
                                    var utx = {
                                        txid: rtx.txid,
                                        vin: rvin,
                                        vout: rvout,
                                        total: total.toFixed(8),
                                        timestamp: rtx.time,
                                        blockhash: '-',
                                        blockindex: -1,
                                    };
                                    res.status(200).json({tx: utx, confirmations: settings.confirmations, blockcount:-1});
                                } else {
                                    var utx = {
                                        txid: rtx.txid,
                                        vin: rvin,
                                        vout: rvout,
                                        total: total.toFixed(8),
                                        timestamp: rtx.time,
                                        blockhash: rtx.blockhash,
                                        blockindex: rtx.blockheight,
                                    };
                                    lib.get._blockcount(coin).then((blockcount) =>{
                                        res.status(200).json({tx: utx, confirmations: settings.confirmations, blockcount: blockcount});
                                    });
                                }
                            });
                        });
                    });
                } else {
                    res.status(200).send('null')
                }
            });
        }
    });
}
function route_get_address(conn, res, hash, count) {
    db.get_address(conn, hash).then((address) =>{
        if (address) {
            var txs = [];
            var hashes = address.txs.reverse();
            if (address.txs.length < count) {
                count = address.txs.length;
            }
            lib.syncLoop(count, function (loop) {
                var i = loop.iteration();
                db.get_tx(conn, hashes[i].addresses).then((tx) =>{
                    if (tx) {
                        txs.push(tx);
                        loop.next();
                    } else {
                        loop.next();
                    }
                });
            }, function(){
                res.status(200).json({address: address, txs: txs});
            });

        } else {
            res.status(404).send('Not found');
        }
    });
}
module.exports = (data) =>{
    var coin = data.name;
    var conn = data.connection;
    var router = express();
    var settings = require(`../../initial/${coin}`);
    router.get('/tx/:txid', (req, res)=>{
        var txid = req.params.txid
        if (txid == settings.genesis_tx) {
            route_get_block(conn, res, coin, settings.genesis_block);
        } else {
            db.get_tx(conn, txid).then((tx) =>{
                if (tx) {
                    lib.get._blockcount(coin).then((blockcount) =>{
                        res.status(200).json({tx: tx, blockcount: blockcount});
                    });
                }
                else {
                    lib.get._rawtransaction(coin, txid).then((rtx) =>{
                        if (rtx.txid) {
                            lib.prepare_vin(coin, rtx, function(vin) {
                                lib.prepare_vout(rtx.vout, rtx.txid, vin, function(rvout, rvin) {
                                    lib.calculate_total(rvout).then((total)=>{
                                        if (!rtx.confirmations > 0) {
                                            var utx = {
                                                txid: rtx.txid,
                                                vin: rvin,
                                                vout: rvout,
                                                total: total.toFixed(8),
                                                timestamp: rtx.time,
                                                blockhash: '-',
                                                blockindex: -1,
                                            };
                                            res.status(200).json({tx: utx, confirmations: settings.confirmations, blockcount:-1});
                                        } else {
                                            var utx = {
                                                txid: rtx.txid,
                                                vin: rvin,
                                                vout: rvout,
                                                total: total.toFixed(8),
                                                timestamp: rtx.time,
                                                blockhash: rtx.blockhash,
                                                blockindex: rtx.blockheight,
                                            };
                                            lib.get._blockcount(coin).then((blockcount) =>{
                                                res.status(200).json({tx: utx, confirmations: settings.confirmations, blockcount: blockcount});
                                            });
                                        }
                                    });
                                });
                            });
                        } else {
                            res.status(200).send('null')
                        }
                    });
                }
            });
        }
    })
    router.get('/block/:hash', function(req, res) {
        var hash = req.params.hash;
        route_get_block(conn, res, coin, hash);
    });

    router.get('/address/:hash', function(req, res) {
        var hash = req.params.hash
        console.log(hash)
        route_get_address(conn, res, hash, settings.txcount);
    });

    router.get('/address/:hash/:count', function(req, res) {
        var hash = req.params.hash
        var count = req.params.count
        route_get_address(conn, res, coin, hash, count);
    });
    return router;
}


// router.get('/richlist', function(req, res) {
//   if (settings.display.richlist == true ) {
//     db.get_stats(settings.coin, function (stats) {
//       db.get_richlist(settings.coin, function(richlist){
//         //console.log(richlist);
//         if (richlist) {
//           db.get_distribution(richlist, stats, function(distribution) {
//             //console.log(distribution);
//             res.render('richlist', {
//               active: 'richlist',
//               balance: richlist.balance,
//               received: richlist.received,
//               stats: stats,
//               dista: distribution.t_1_25,
//               distb: distribution.t_26_50,
//               distc: distribution.t_51_75,
//               distd: distribution.t_76_100,
//               diste: distribution.t_101plus,
//               show_dist: settings.richlist.distribution,
//               show_received: settings.richlist.received,
//               show_balance: settings.richlist.balance,
//             });
//           });
//         } else {
//           route_get_index(res, null);
//         }
//       });
//     });
//   } else {
//     route_get_index(res, null);
//   }
// });

// router.get('/movement', function(req, res) {
//   res.render('movement', {active: 'movement', flaga: settings.movement.low_flag, flagb: settings.movement.high_flag, min_amount:settings.movement.min_amount});
// });
//
// router.get('/network', function(req, res) {
//   res.render('network', {active: 'network'});
// });

// router.get('/reward', function(req, res){
//   //db.get_stats(settings.coin, function (stats) {
//     console.log(stats);
//     db.get_heavy(settings.coin, function (heavy) {
//       //heavy = heavy;
//       var votes = heavy.votes;
//       votes.sort(function (a,b) {
//         if (a.count < b.count) {
//           return -1;
//         } else if (a.count > b.count) {
//           return 1;
//         } else {
//          return 0;
//         }
//       });
//
//       res.render('reward', { active: 'reward', stats: stats, heavy: heavy, votes: heavy.votes });
//     });
//   //});
// });



// router.get('/block/:hash', function(req, res) {
//   route_get_block(res, req.param('hash'));
// });
//
//   router.get('/:coin/address/:hash', function(req, res) {
//     console.log(req.params('coin'));
//     route_get_address(conn, res, req.params('coin'), req.params('hash'), settings.txcount);
//   });
//
// router.get('/address/:hash/:count', function(req, res) {
//   route_get_address(res, req.param('hash'), req.param('count'));
// });
//
// router.post('/search', function(req, res) {
//   var query = req.body.search;
//   if (query.length == 64) {
//     if (query == settings.genesis_tx) {
//       res.redirect('/block/' + settings.genesis_block);
//     } else {
//       db.get_tx(query, function(tx) {
//         if (tx) {
//           res.redirect('/tx/' +tx.txid);
//         } else {
//           lib.get_block(query, function(block) {
//             if (block != 'There was an error. Check your console.') {
//               res.redirect('/block/' + query);
//             } else {
//               route_get_index(res, locale.ex_search_error + query );
//             }
//           });
//         }
//       });
//     }
//   } else {
//     db.get_address(query, function(address) {
//       if (address) {
//         res.redirect('/address/' + address.a_id);
//       } else {
//         lib.get_blockhash(query, function(hash) {
//           if (hash != 'There was an error. Check your console.') {
//             res.redirect('/block/' + hash);
//           } else {
//             route_get_index(res, locale.ex_search_error + query );
//           }
//         });
//       }
//     });
//   }
// });
//
// router.get('/qr/:string', function(req, res) {
//   if (req.param('string')) {
//     var address = qr.image(req.param('string'), {
//       type: 'png',
//       size: 4,
//       margin: 1,
//       ec_level: 'M'
//     });
//     res.type('png');
//     address.pipe(res);
//   }
// });
//
// router.get('/ext/summary', function(req, res) {
//   lib.get_difficulty(function(difficulty) {
//     difficultyHybrid = ''
//     if (difficulty['proof-of-work']) {
//             if (settings.index.difficulty == 'Hybrid') {
//               difficultyHybrid = 'POS: ' + difficulty['proof-of-stake'];
//               difficulty = 'POW: ' + difficulty['proof-of-work'];
//             } else if (settings.index.difficulty == 'POW') {
//               difficulty = difficulty['proof-of-work'];
//             } else {
//         difficulty = difficulty['proof-of-stake'];
//       }
//     }
//     lib.get_hashrate(function(hashrate) {
//       lib.get_connectioncount(function(connections){
//         lib.get_masternodecount(function(masternodestotal){
//           lib.get_masternodecountonline(function(masternodesonline){
//             lib.get_blockcount(function(blockcount) {
//               db.get_stats(settings.coin, function (stats) {
//                 if (hashrate == 'There was an error. Check your console.') {
//                   hashrate = 0;
//                 }
//                 var masternodesoffline = Math.floor(masternodestotal - masternodesonline);
//                 res.send({ data: [{
//                   difficulty: difficulty,
//                   difficultyHybrid: difficultyHybrid,
//                   supply: stats.supply,
//                   hashrate: hashrate,
//                   lastPrice: stats.last_price,
//                   connections: connections,
//                   masternodeCountOnline: masternodesonline,
//                   masternodeCountOffline: masternodesoffline,
//                   blockcount: blockcount
//                 }]});
//               });
//             });
//           });
//         });
//       });
//     });
//   });
// });