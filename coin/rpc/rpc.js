const promise = require('bluebird');
const myRPC = require('./myRPC');

// Singleton.
let instance = null;

/**
 * RPC
 * Singleton rpc handler for the system.
 * TODO: Add cache if needed.
 */
class RPC {
    constructor(config) {
        this.rpc = new myRPC(
            config.host,
            config.port,
            config.user,
            config.pass,
            config.timeout
        )
    }
    call(fn, params = []) {
        if (!fn) {
            return Promise.reject(new Error('Please provide a rpc method name.'));
        }

        if (!params) {
            params = [];
        }
        return new promise((resolve, reject) => {
            this.rpc.call(fn, params, (err, data) => {
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
        this.rpc.setTimeout(ms);
    }
}

module.exports = RPC;