var request = require('request')
  , settings = require('../initial/settings')
  , Address = require('../model/address');
var axios = require('axios')
var base_server = 'http://127.0.0.1:' + settings.port + "/";
var base_url = (coin) => {return (base_server + 'api/' + coin +'/')};

var get_supply = (coin, type) => new Promise((res, rej) =>{
  var coinbase_supply = () => new Promise((res, rej) => {
    Address.findOne({a_id: 'coinbase'}, function(err, data) {
      if (data) {
        res(data.sent);
      } else {
        res('Not have coinbase?');
      }
    });
  })
  var balance_supply = ()=> new Promise((res, rej)=> {
    Address.find({}, 'balance').where('balance').gt(0).exec(function(err, docs) {
      var count = 0;
      for (let item of docs){
        count += item.balance;
      }
      res(count);
    });
  })
  if (type == 'GETINFO') {
    var uri = base_url(coin) + 'getinfo';
    request({uri: uri, json: true}, function (error, response, body) {
      res(body.moneysupply);
    });
  } else if (type == 'BALANCES') {
    balance_supply().then((supply)=> {
      res(supply/100000000);
    });
  } else if (type == 'TXOUTSET') {
    var uri = base_url(coin) + 'gettxoutsetinfo';
    request({uri: uri, json: true}, function (error, response, body) {
      res(body.total_amount);
    });
  } else {
    coinbase_supply().then((supply)=> {
      res(supply/100000000);
    });
  }
})
var get = {
  _supply: get_supply,
  _difficulty: (coin) => new Promise((res)=>{axios.get(base_url(coin) + 'getdifficulty').then(data=>res(data.data))}),
  _connectioncount: (coin) => new Promise((res)=>{axios.get(base_url(coin) + 'getconnectioncount').then(data=>res(data.data))}),
  _masternodecount: (coin) => new Promise((res)=>{axios.get(base_url(coin) + 'getmasternodecount').then(data=>res(data.data))}),
  _masternodecountonline: (coin) => new Promise((res)=>{axios.get(base_url(coin) + 'getmasternodecountonline').then(data=>res(data.data))}),
  _blockcount: (coin) => new Promise((res)=>{axios.get(base_url(coin) + 'getblockcount').then(data=>res(data.data))}),
  _blockhash: (coin, height) => new Promise((res)=>{axios.get(base_url(coin) + 'getblockhash?height=' + height).then(data=>res(data.data))}),
  _block: (coin, hash) => new Promise((res)=>{axios.get(base_url(coin) + 'getblock?hash=' + hash).then(data=>res(data.data))}),
  _rawtransaction: (coin, hash) => new Promise((res)=>{axios.get(base_url(coin) + 'getrawtransaction?txid=' + hash + '&decrypt=1').then(data=>res(data.data))}),
  _hashrate: (coin, unit) => new Promise((res) =>{
    axios.get(base_url(coin) + 'getnetworkhashps').then(data=>{
      switch (unit) {
        case 'K': res((data.data / 1000).toFixed(4)); break;
        case 'M': res((data.data / 1000000).toFixed(4)); break;
        case 'G': res((data.data / 1000000000).toFixed(4)); break;
        case 'P': res((data.data / 1000000000000).toFixed(4)); break;
        case 'T': res((data.data / 1000000000000000).toFixed(4)); break;
        default: res('-')
      }
    })
  }),
  _peer: (coin) => new Promise((res)=>{axios.get(base_url(coin) + 'getpeerinfo').then(data=>res(data.data))}),
}
var is_unique = (array, object) => new Promise((res, rej) =>{
    var unique = true;
    var count = -1;
    for (let item of array){
        count +=1
        if (item.addresses == object){
            unique = false;
            res([unique, count])
        }
    }
    res([unique, count])
})
var convert_to_satoshi = (amount) => new Promise((res, rej)=> {
    var fixed = amount.toFixed(8).toString();
    res(parseInt(fixed.replace('.', '')));
})

module.exports = {
  convert_to_satoshi: convert_to_satoshi,
  is_unique: is_unique,
  get: get,
  calculate_total: (vout)=> new Promise((res, rej) => {
    var total = 0;
    for (let item of vout){
        // console.log(item.amount)
        total = total + item.amount;
    }
    res(total);
  }),
    prepare_vout: function(vout, txid, vin, cb) {
        var arr_vout = [];
        var arr_vin = [];
        arr_vin = vin;
        module.exports.syncLoop(vout.length, function (loop) {
            var i = loop.iteration();
            // make sure vout has an address
            if (vout[i].scriptPubKey.type != 'nonstandard' && vout[i].scriptPubKey.type != 'nulldata') {
                // check if vout address is unique, if so add it array, if not add its amount to existing index
                //console.log('vout:' + i + ':' + txid);
                is_unique(arr_vout, vout[i].scriptPubKey.addresses[0]).then(([unique, index]) =>{
                    if (unique == true) {
                        // unique vout
                        convert_to_satoshi(parseFloat(vout[i].value)).then((amount_sat)=>{
                            arr_vout.push({addresses: vout[i].scriptPubKey.addresses[0], amount: amount_sat});
                            loop.next();
                        });
                    } else {
                        convert_to_satoshi(parseFloat(vout[i].value)).then((amount_sat)=>{
                            arr_vout[index].amount = arr_vout[index].amount + amount_sat;
                            loop.next();
                        });
                    }
                });
            } else {
                // no address, move to next vout
                loop.next();
            }
        }, function(){
            if (vout[0].scriptPubKey.type == 'nonstandard') {
                if ( arr_vin.length > 0 && arr_vout.length > 0 ) {
                    if (arr_vin[0].addresses == arr_vout[0].addresses) {
                        //PoS
                        arr_vout[0].amount = arr_vout[0].amount - arr_vin[0].amount;
                        arr_vin.shift();
                        return cb(arr_vout, arr_vin);
                    } else {
                        return cb(arr_vout, arr_vin);
                    }
                } else {
                    return cb(arr_vout, arr_vin);
                }
            } else {
                return cb(arr_vout, arr_vin);
            }
        });
    },

    get_input_addresses: function(coin, input, vout, cb) {
        var addresses = [];
        if (input.coinbase) {
            var amount = 0;
            module.exports.syncLoop(vout.length, function (loop) {
                var i = loop.iteration();
                amount = amount + parseFloat(vout[i].value);
                loop.next();
            }, function(){
                addresses.push({hash: 'coinbase', amount: amount});
                return cb(addresses);
            });
        } else {
            get._rawtransaction(coin, input.txid).then((tx)=>{
                if (tx) {
                    module.exports.syncLoop(tx.vout.length, function (loop) {
                        var i = loop.iteration();
                        if (tx.vout[i].n == input.vout) {
                            //module.exports.convert_to_satoshi(parseFloat(tx.vout[i].value), function(amount_sat){
                            if (tx.vout[i].scriptPubKey.addresses) {
                                addresses.push({hash: tx.vout[i].scriptPubKey.addresses[0], amount:tx.vout[i].value});
                            }
                            loop.break(true);
                            loop.next();
                            //});
                        } else {
                            loop.next();
                        }
                    }, function(){
                        return cb(addresses);
                    });
                } else {
                    return cb();
                }
            });
        }
    },

    prepare_vin: function(coin, tx, cb) {
        var arr_vin = [];
        module.exports.syncLoop(tx.vin.length, function (loop) {
            var i = loop.iteration();
            module.exports.get_input_addresses(coin, tx.vin[i], tx.vout, (addresses)=>{
                if (addresses && addresses.length) {
                    is_unique(arr_vin, addresses[0].hash).then(([unique, index])=> {
                        if (unique == true) {
                            convert_to_satoshi(parseFloat(addresses[0].amount)).then((amount_sat)=>{
                                arr_vin.push({addresses:addresses[0].hash, amount:amount_sat});
                                loop.next();
                            });
                        } else {
                            convert_to_satoshi(parseFloat(addresses[0].amount)).then((amount_sat)=>{
                                arr_vin[index].amount = arr_vin[index].amount + amount_sat;
                                loop.next();
                            });
                        }
                    });
                } else {
                    loop.next();
                }
            });
        }, function(){
            return cb(arr_vin);
        });
    },

    syncLoop: function(iterations, process, exit){
        var index = 0,
            done = false,
            shouldExit = false;
        var loop = {
            next:function(){
                if(done){
                    if(shouldExit && exit){
                        exit(); // Exit if we're done
                    }
                    return; // Stop the loop if we're done
                }
                // If we're not finished
                if(index < iterations){
                    index++; // Increment our index
                    if (index % 100 === 0) { //clear stack
                        setTimeout(function() {
                            process(loop); // Run our process, pass in the loop
                        }, 1);
                    } else {
                        process(loop); // Run our process, pass in the loop
                    }
                    // Otherwise we're done
                } else {
                    done = true; // Make sure we say we're done
                    if(exit) exit(); // Call the callback on exit
                }
            },
            iteration:function(){
                return index - 1; // Return the loop number we're on
            },
            break:function(end){
                done = true; // End the loop
                shouldExit = end; // Passing end as true means we still call the exit callback
            }
        };
        loop.next();
        return loop;
    },
};