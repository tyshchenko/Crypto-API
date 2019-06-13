require('babel-polyfill');
const exit = require('../lib/exit');
const locker = require('../lib/locker');

module.exports = async coin => {
    // Models.
    const Block = await coin.block;
    const Coin = await coin.coin;
    const Masternode = await coin.masternode;
    const Peer = await coin.peer;
    const Rich = await coin.rich;
    const TX = await coin.tx;
    const UTXO = await coin.utxo;
    const BlockReward = await coin.blockreward;
    async function clearDatabase() {
        await Block.remove({});
        await Coin.remove({});
        await Masternode.remove({});
        await Peer.remove({});
        await Rich.remove({});
        await TX.remove({});
        await UTXO.remove({});
        await BlockReward.remove({});
    }
    async function update() {
        let code = 0;
        try {
            locker.lock(coin.name,'block');
            locker.lock(coin.name,'coin');
            locker.lock(coin.name,'masternode');
            locker.lock(coin.name,'peer');
            locker.lock(coin.name,'rich');
            locker.lock(coin.name,'tx');
            locker.lock(coin.name,'utxo');
            locker.lock(coin.name,'blockreward');
            await clearDatabase();
        } catch(err) {
            console.log(err);
            code = 1;
        } finally {
            try {
                locker.unlock(coin.name,'block');
                locker.unlock(coin.name,'coin');
                locker.unlock(coin.name,'masternode');
                locker.unlock(coin.name,'peer');
                locker.unlock(coin.name,'rich');
                locker.unlock(coin.name,'tx');
                locker.unlock(coin.name,'utxo');
                locker.unlock(coin.name,'blockreward');
            } catch(err) {
                console.log(err);
                code = 1;
            }
            exit(code);
        }
    }
    update();
};