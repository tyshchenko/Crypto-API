const promise = require('bluebird');
const rpc = require('node-bitcoin-rpc');

// Singleton.
let instance = null;

/**
 * RPC
 * Singleton rpc handler for the system.
 * TODO: Add cache if needed.
 */
class RPC {
    constructor(config) {
        if (!instance) {
            instance = this;

            rpc.init(
                config.host,
                config.port,
                config.user,
                config.pass
            );

            rpc.setTimeout(config.timeout);
        }

        return instance;
    }

    call(fn, params = []) {
        if (!fn) {
            return Promise.reject(new Error('Please provide a rpc method name.'));
        }

        if (!params) {
            params = [];
        }

        return new promise((resolve, reject) => {
            rpc.call(fn, params, (err, data) => {
                if (err || !!data.error) {
                    console.log(fn, err || data.error);
                    reject(new Error(err || data.error));
                    return;
                }

                resolve(data.result);
            });
        });
    }

    /**
     * Set the timeout for the rpc interface.
     * @param {Number} ms The number of milliseconds for the timeout.
     */
    timeout(ms) {
        if (!ms) {
            return;
        }

        rpc.setTimeout(ms);
    }
}

module.exports = RPC;