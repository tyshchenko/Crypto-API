require('babel-polyfill');
const exit = require('../lib/exit');
const locker = require('../lib/locker');
var arrayOfCoin = require(`../coin/arrayOfCoin`);
 var rich = async coin => {
    // Models.
    const Rich = await coin.rich;
    const UTXO = await coin.utxo;
    async function syncRich() {
        await Rich.remove({});
        const addresses = await UTXO.aggregate([
            { $group: { _id: '$address', sum: { $sum: '$value' } } },
            { $sort: { sum: -1 } }
        ]);
        await Rich.insertMany(addresses.filter(addr => addr._id !== 'ZEROCOIN').map(addr => ({
            address: addr._id,
            value: addr.sum
        })));
    }
    async function update() {
        const type = 'rich';
        let code = 0;

        try {
            locker.lock(coin.name, type);
            await syncRich();
        } catch(err) {
            console.log(err);
            code = 1;
        } finally {
            try {
                locker.unlock(coin.name, type);
            } catch(err) {
                console.log(err);
                code = 1;
            }
            exit(code);
        }
    }
    update();
};
Promise.all(arrayOfCoin.map(i => {
    rich(i);
}));