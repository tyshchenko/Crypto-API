var request = require('request')
  , settings = require('./settings')
  , Address = require('../models/address');
var axios = require('axios')
var base_server = 'http://127.0.0.1:' + settings.port + "/";

var base_url = base_server + 'api/';

var get_supply = (type) => new Promise((res, rej) =>{
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
    var uri = base_url + 'getinfo';
    request({uri: uri, json: true}, function (error, response, body) {
      res(body.moneysupply);
    });
  } else if (type == 'BALANCES') {
    balance_supply().then((supply)=> {
      res(supply/100000000);
    });
  } else if (type == 'TXOUTSET') {
    var uri = base_url + 'gettxoutsetinfo';
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
  _difficulty: () => new Promise((res)=>{axios.get(base_url + 'getdifficulty').then(data=>res(data.data))}),
  _connectioncount: () => new Promise((res)=>{axios.get(base_url + 'getconnectioncount').then(data=>res(data.data))}),
  _masternodecount: () => new Promise((res)=>{axios.get(base_url + 'getmasternodecount').then(data=>res(data.data))}),
  _masternodecountonline: () => new Promise((res)=>{axios.get(base_url + 'getmasternodecountonline').then(data=>res(data.data))}),
  _blockcount: () => new Promise((res)=>{axios.get(base_url + 'getblockcount').then(data=>res(data.data))}),
  _blockhash: (height) => new Promise((res)=>{axios.get(base_url + 'getblockhash?height=' + height).then(data=>res(data.data))}),
  _block: (hash) => new Promise((res)=>{axios.get(base_url + 'getblock?hash=' + hash).then(data=>res(data.data))}),
  _rawtransaction: (hash) => new Promise((res)=>{axios.get(base_url + 'getrawtransaction?txid=' + hash + '&decrypt=1').then(data=>res(data.data))}),
  _hashrate: (unit) => new Promise((res) =>{
    axios.get(base_url + 'getnetworkhashps').then(data=>{
      switch (unit) {
        case 'K': res((data.data / 1000).toFixed(4)); break;
        case 'M': res((data.data / 1000000).toFixed(4)); break;
        case 'G': res((data.data / 1000000000).toFixed(4)); break;
        case 'P': res((data.data / 1000000000000).toFixed(4)); break;
        case 'T': res((data.data / 1000000000000000).toFixed(4)); break;
        default: res('-')
      }
    })
  })
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

var get_input_addresses = (input, vout) => new Promise((res, rej)=> {
  var addresses = [];
  if (input.coinbase) {
    var amount = 0;
    for (var i of vout){
      amount += parseFloat(i.value);
    }
    res(addresses.push({hash: 'coinbase', amount: amount}))
  } else {
    get._rawtransaction(input.txid).then((tx)=>{
      if (tx) {
        for (var i of tx.vout) {
          if (i.n == input.vout) {
            if (i.scriptPubKey.addresses) {
              addresses.push({hash: i.scriptPubKey.addresses[0], amount: i.value});
            }
          }
        }
        res(addresses);
      } else {res(null)}
    });
  }
})

module.exports = {
  convert_to_satoshi: convert_to_satoshi,
  is_unique: is_unique,
  get_supply: get_supply,
  get: get,
  calculate_total: (vout)=> new Promise((res, rej) => {
    var total = 0;
    for (let item of vout){
        total += item.amout;
    }
    res(total);
  }),
  prepare_vout: (vout, txid, vin) => new Promise((res, rej)=> {
    var arr_vout = [];
    var arr_vin = [];
    arr_vin = vin;
    var fx1 = (arr_vout, vout) => new Promise((res, rej) => {
      for (let i of vout) {
        if (i.scriptPubKey.type != 'nonstandard' && i.scriptPubKey.type != 'nulldata') {
          is_unique(arr_vout, i.scriptPubKey.addresses[0])
              .then(([unique, index]) => {
                if (unique == true) {
                  convert_to_satoshi(parseFloat(i.value)).then(amount_sat => {
                    arr_vout.push({addresses: i.scriptPubKey.addresses[0], amount: amount_sat})
                  })
                } else {
                  convert_to_satoshi(parseFloat(i.value)).then(amount_sat => {
                    arr_vout[index].amount += amount_sat
                  })
                }
              })
        } else {}
      }
      res(arr_vout)
    })
    fx1(arr_vout, vout).then((arr_vout)=>{
      if (vout[0].scriptPubKey.type == 'nonstandard') {
        if ( arr_vin.length > 0 && arr_vout.length > 0 ) {
          if (arr_vin[0].addresses == arr_vout[0].addresses) {
            //PoS
            arr_vout[0].amount += arr_vin[0].amount;
            arr_vin.shift();
            res([arr_vout, arr_vin]);
          } else {
            res([arr_vout, arr_vin]);
          }
        } else {
          res([arr_vout, arr_vin]);
        }
      } else {
        res([arr_vout, arr_vin]);
      }
    })
  }),

  prepare_vin: (tx) => new Promise((res, rej) => {
    var arr_vin = [];
    for (var i of tx.vin){
      get_input_addresses(i, tx.vout).then(addresses => {
        if (addresses && addresses.length) {
          is_unique(arr_vin, addresses[0].hash).then(([unique, index]) =>{
            if (unique == true) {
              convert_to_satoshi(parseFloat(addresses[0].amount)).then((amount_sat)=>{
                arr_vin.push({addresses: addresses[0].hash, amount: amount_sat});
              });
            } else {
              convert_to_satoshi(parseFloat(addresses[0].amount)).then((amount_sat)=>{
                arr_vin[index].amount += amount_sat;
              });
            }
          });
        } else {}
      })
    }
    res(arr_vin);
  }),
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