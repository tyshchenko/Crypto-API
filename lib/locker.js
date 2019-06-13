/**
 * Locker
 *
 * Provide methods to lock cron tasks
 * so that multiple crons are not ran at once.
 */
const fs = require('fs');
const path = require('path');

/**
 * Get the path to the tmp folder cron lock file.
 * @param {String} type The cron name.
 */
const getPath = (coin, type) => {
    return path.join(__dirname, '../tmp', `${type}-${coin}.cron_lock`);
};

/**
 * Create a new lock for the cron.
 * @param {String} type The cron name.
 */
const lock = (coin, type) => {
    const p = getPath(coin, type);
    const found = fs.existsSync(p);
    if (found) {
        throw new Error(`
      Lock found for '${ type } - ${coin}', cron may already be running.
      If not already running remove ${ type }- ${coin}.cron_lock and try again.
    `);
    }

    fs.writeFileSync(p, process.pid);
};

/**
 * Unlock the cron name.
 * @param {String} type The cron name.
 */
const unlock = (coin, type) => {
    fs.unlinkSync(getPath(coin, type));
};

module.exports = { lock, unlock };