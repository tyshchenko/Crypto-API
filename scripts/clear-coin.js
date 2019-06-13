require('babel-polyfill');
const exit = require('../lib/exit');
const locker = require('../lib/locker');

module.exports = async (coin) => {
    const Coin = await coin.coin;
    async function clearDatabase() {
        await Coin.remove({});
    }
    async function update() {
        let code = 0;
        try {
            locker.lock(coin.name,'coin');
            await clearDatabase();
        } catch (err) {
            console.log(err);
            code = 1;
        } finally {
            try {
                locker.unlock(coin.name,'coin');
            } catch (err) {
                console.log(err);
                code = 1;
            }
            exit(code);
        }
    }
    update();
};