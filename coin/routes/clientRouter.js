var express = require('express');
module.exports = (client) => {
    var app = express();
    app.get('*', function(req, res){
        var method = req.path.substring(1,req.path.length);

        // if('undefined' != typeof requires_passphrase[method]){
        //     if(wallet_passphrase) client.walletPassphrase(wallet_passphrase, 10);
        //     else res.send('A wallet passphrase is needed and has not been set.');
        // }

        var query_parameters = req.query;
        var params = [];

        for(var parameter in query_parameters){
            if(query_parameters.hasOwnProperty(parameter)){
                var param = query_parameters[parameter];
                if(!isNaN(param)){
                    param = parseFloat(param);
                }
                params.push(param);
            }
        }

        var command = [];

        //this is pretty dirty but it is working for now
        if(method == 'sendmany' ||
            method == 'getmasternodecount' ||
            method == 'getmasternodecountonline' ||
            method == 'getmasternodelist' ||
            method == 'getvotelist'){
            command = specialApiCase(method);
        }else{
            command = [{
                method: method,
                params: params
            }];
        }

        client.cmd(command, function(err, response){
            if(err){console.log(err); res.send("There was an error. Check your console.");}
            else{
                if(typeof response === 'object'){
                    res.json(response);
                }
                else{
                    res.send(""+response);
                }
            }
        });
    });
    //
    // function hasAccess(req, res, next){
    //     if(accesslist.type == 'all'){
    //         return next();
    //     }
    //
    //     var method = req.path.substring(1,req.path.length);
    //     if('undefined' == typeof accesslist[method]){
    //         if(accesslist.type == 'only') res.end('This method is restricted.');
    //         else return next();
    //     }
    //     else{
    //         if(accesslist[method] == true){
    //             return next();
    //         }
    //         else res.end('This method is restricted.');
    //     }
    // }

    // function specialApiCase(method_name){
    //     var params = [];
    //     if(method_name == 'sendmany'){
    //         var after_account = false;
    //         var before_min_conf = true;
    //         var address_info = {};
    //         for(var parameter in query_parameters){
    //             if(query_parameters.hasOwnProperty(parameter)){
    //                 if(parameter == 'minconf'){
    //                     before_min_conf = false;
    //                     params.push(address_info);
    //                 }
    //                 var param = query_parameters[parameter];
    //                 if(!isNaN(param)){
    //                     param = parseFloat(param);
    //                 }
    //                 if(after_account && before_min_conf){
    //                     address_info[parameter] = param;
    //                 }
    //                 else{
    //                     params.push(param);
    //                 }
    //                 if(parameter == 'account') after_account = true;
    //             }
    //         }
    //         if(before_min_conf){
    //             params.push(address_info);
    //         }
    //     }
    //
    //     //not liking this
    //
    //     if(method_name == 'getvotelist'){
    //         method_name = 'masternodelist'
    //         params.push('votes');
    //     }
    //
    //     if(method_name == 'getmasternodelist'){
    //         method_name = 'masternodelist'
    //         params.push('full');
    //     }
    //
    //     if(method_name == 'getmasternodecount'){
    //         method_name = 'masternode';
    //         params.push('count');
    //         params.push('total');
    //     }
    //
    //     if(method_name == 'getmasternodecountonline'){
    //         method_name = 'masternode';
    //         params.push('count');
    //         params.push('enabled');
    //     }
    //
    //     return [{
    //         method: method_name,
    //         params: params
    //     }];
    // }

    return app;

};