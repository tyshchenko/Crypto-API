
var http = require('http');
class myRPC {
    constructor(hostname, port, user, pass, timeout){
        this.BITCOIND_HOSTNAME = hostname;
        this.BITCOIND_PORT = port;
        this.BITCOIND_USERNAME = user;
        this.BITCOIND_PASSWORD = pass;
        this.BITCOIND_TIMEOUT = timeout;
    }
    call(method, params, cb){
        var postData = JSON.stringify({
            method: method,
            params: params,
            id: '1'
        });

        var options = {
            hostname: this.BITCOIND_HOSTNAME,
            port: this.BITCOIND_PORT,
            path: '/',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': postData.length
            },
            auth: this.BITCOIND_USERNAME + ':' + this.BITCOIND_PASSWORD
        };

        var req = http.request(options, function A (res) {
            cb_handleRequestResponse(res, cb)
        });

        req.on('error', function response (e) {
            cb(e.message)
        });

        req.setTimeout(this.BITCOIND_TIMEOUT, function cb_onTimeout (e) {
            cb('Timed out');
            req.abort()
        });

        // write data to request body
        req.write(postData);
        req.end()
    };
    setTimeout (timeout) {
        this.BITCOIND_TIMEOUT = timeout
    }
}

function cb_handleRequestResponse (res, cb) {
    var data = '';
    res.setEncoding('utf8');
    res.on('data', function (chunk) {
        data += chunk
    });
    res.on('end', function () {
        if (res.statusCode === 401) {
            cb(res.statusCode)
        } else {
            try {
                data = JSON.parse(data)
                cb(null, data)
            } catch(err){
                cb(err, null)
            }
        }
    });
}
module.exports = myRPC;