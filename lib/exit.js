require('babel-polyfill');
const mongoose = require('mongoose');

process.on('unhandledRejection', (err) => {
    console.log(JSON.stringify(err));
});


const exit = (code = 0) => {
    try {
        mongoose.disconnect();
    } catch(err) {
        console.log('db:', err);
    } finally {
        process.exit(code);
    }
};

module.exports =  exit;