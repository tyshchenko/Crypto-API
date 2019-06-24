var bip39 = require('bip39');
var hdkey = require('hdkey');
var createHash = require('create-hash');
var btcLib = require('bitcoinjs-lib');
var bs58check = require('bs58check');
var wif = require('wif');
const version = {private: 0x3A805837, public: 0x3A8061A0};
const ext_pub = 'BHdKjHP4RMmkk2u7Bmr7zjCBrBCjRjzD4V';
var test = async ()=>{
    //const mnemonic = bip39.generateMnemonic(); //generates string
    const mnemonic = "soup lens multiply sketch sand domain believe dawn december regret cube fox";
    const seed = await bip39.mnemonicToSeed(mnemonic); //creates seed buffer
    const root = hdkey.fromExtendedKey(ext_pub);
    const masterPub = root.publicKey.toString('hex');
    const masterPrivateKey = root.privateKey.toString('hex');
    const addrnode = root.derive("m/44'/188'/0'/0/101");
    const pub = await addrnode._publicKey;
    const priv = await addrnode._privateKey;
    const step2 = createHash('sha256').update(pub).digest();
    const step3 = createHash('rmd160').update(step2).digest();
    const step4 = Buffer.allocUnsafe(21);
    step4.writeUInt8(0x19, 0);
    step3.copy(step4, 1); //step4 now holds the extended RIPMD-160 result
    const step9 = bs58check.encode(step4);
    const importPrivKey = wif.encode(179, priv, true);
    return await {
        mnemonic: mnemonic,
        seed: seed.toString('hex'),
        masterPrivateKey: masterPrivateKey,
        masterPub: masterPub,
        addrnode: addrnode,
        priv: importPrivKey,
        pub: pub.toString('hex'),
        step2: step2.toString('hex'),
        step3: step3.toString('hex'),
        step4: step4.toString('hex'),
        step9: step9
    }
};

test().then(data=>console.log(data));

// var algorithms = ['quark'];
//
// var data = new Buffer("7000000001e980924e4e1109230383e66d62945ff8e749903bea4336755c00000000000051928aff1b4d72416173a8c3948159a09a73ac3bb556aa6bfbcad1a85da7f4c1d13350531e24031b939b9e2b", "hex");
//
// var hashedData = algorithms.map(function(algo){
//     if (algo === 'scryptjane'){
//         //scryptjane needs block.nTime and nChainStartTime (found in coin source)
//         var yaCoinChainStartTime = 1367991200;
//         var nTime = Math.round(Date.now() / 1000);
//         return multiHashing[algo](data, nTime, yaCoinChainStartTime);
//     }
//     else{
//         return multiHashing[algo](data);
//     }
// });
//
//
// console.log(hashedData);
/*
	Mainnet
	pubKeyHash: 0x00,
	Testnet
	pubKeyHash: 0x6f,
*/