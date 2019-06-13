require('babel-polyfill');
const exit = require('../lib/exit');
const fetch = require('../lib/fetch');
const locker = require('../lib/locker');
const moment = require('moment');
var arrayOfCoin = require(`../coin/arrayOfCoin`);
var coin = async (coin) => {
    const Rich = await coin.rich;
    const Coin = await coin.coin;
    const rpc = await coin.rpc;
    const config = require(`../initial/${coin.name}`);
    async function syncCoin() {
        const date = moment().utc().startOf('minute').toDate();
        const url = `${config.coinMarketCap.api}${config.coinMarketCap.ticker}`;
        const info = await rpc.call('getinfo');
        const masternodes = await rpc.call('getmasternodecount');
        const nethashps = await rpc.call('getnetworkhashps');
        var activewallets = 0;
        await Rich.find({ 'value': { $gt: 0 } }).count(function(err, count) {
            if (err) { console.log(err) }
            activewallets = count;
        });
        let market = await fetch(url);
        if (Array.isArray(market)) {
            market = market.length ? market[0] : {};
        }
        const coinx = new Coin({
            cap: market.market_cap_usd,
            createdAt: date,
            blocks: info.blocks,
            btc: market.price_btc,
            diff: info.difficulty,
            mnsOff: masternodes.total - masternodes.stable,
            mnsOn: masternodes.stable,
            netHash: nethashps,
            peers: info.connections,
            status: 'Online',
            supply: info.moneysupply,
            usd: market.price_usd
        });
        await coinx.save();
    }
    async function update() {
        const type = 'coin';
        let code = 0;

        try {
            locker.lock(coin.name, type);
            await syncCoin();
        } catch (err) {
            console.log(err);
            code = 1;
        } finally {
            try {
                locker.unlock(coin.name, type);
            } catch (err) {
                console.log(err);
                code = 1;
            }
            exit(code);
        }
    }
    update();
};
Promise.all(arrayOfCoin.map(i => {
    coin(i);
}));
