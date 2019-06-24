var bitcoin = require('bitcoinjs-lib');
var Core = require('bitcoin-core');
const network = bitcoin.networks.bitcoin

// generate basic bitcoin address
function  get() {
    const keyPair = bitcoin.ECPair.makeRandom({
        network: network
    })
    const publicKey = bitcoin.payments.p2pkh({
        network: network,
        pubkey: keyPair.publicKey
    }).address;
    console.log({bitcoinpubkey: publicKey});
    return
};
var RPC = require('../rpc/rpc');
var client = new RPC({
    host: "localhost",
    port: 19915,
    user: "sha1",
    pass: "sha1",
    timeout: 6000
});
var getKeyPair = async ()=>{
  let pubKey = await client.call('getnewaddress');
  let privKey = await client.call('dumpprivkey', [pubKey]);
  return {pubKey, privKey}
};

getKeyPair().then(data=>console.log(data));
get();