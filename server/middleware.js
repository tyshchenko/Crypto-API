const bodyParser = require('body-parser');
const config = require('../initial/settings');
const cors = require('cors');
// const logger = require('morgan');
const timeout = require('connect-timeout');

/**
 * Will add middleware to the express app.
 * @param {Object} app The express app object.
 */
const middleware = (app) => {
    // app.use(logger('dev'));
    app.use(timeout(config.timeout));
    app.use(cors());
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
};

module.exports = middleware;