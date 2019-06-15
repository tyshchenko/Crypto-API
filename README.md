<h1 align="center">
  <a href="https://api.cryptocritic.live">
    Crypto API
  </a>
</h1>

<p align="center">
  <strong>Multiple cryptocurrency block explorer in same server</strong>
</p>

<p align="center">
  <a href="https://github.com/pinokara/Crypto-API/blob/master/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="Crypto API is released under the MIT license." />
  </a>
  <a href="https://circleci.com/gh/pinokara/Crypto-API">
    <img src="https://circleci.com/gh/facebook/react-native.svg?style=shield" alt="Current CircleCI build status." />
  </a>
</p>

## Contents

- [Requirements](#-requirements)
- [Building](#-building)
- [License](#-license)


## 📋 Requirements

This repo assumes `git`, `mongodb`, `node`, `yarn`, and are installed with configuration done.  Please adjust commands to your local environment. 

Download links:

https://docs.mongodb.com/manual/administration/install-on-linux/

https://nodejs.org/en/download/package-manager/

https://yarnpkg.com/lang/en/docs/install/


## 🎉 Building
#### Clone repository

`git clone https://github.com/pinokara/Crypto-API.git` - copy repo to local folder.

`cd Crypto-API` - change into project directory.

`yarn install` - install packages used by the system.

#### Database Configuration
`mongo` - connect using mongo client.

`use blockex` - switch to database.

`db.createUser( { user: "sha1", pwd: "sha1", roles: [ "readWrite" ] } )` - create a user with the values stored in the `./initial/settings.js` file from above, meaning they should match.

`exit` - exit the mongo client.
#### Cryptocurrency Configuration
`./initial` - Directory of initial cryptocurrency

`./initial/index.js` - Array of initial cryptocurrency

`./initial/${cryptocurrency}.js` - settings of specificial cryptocurrency

`./initial/${cryptocurrency}chain.js` - settings of specificial cryptocurrency blockchain
#### Crontab
The following automated tasks are currently needed for Crypto-API to update but before running the tasks please update the cron script `/path/to/Crypto-API/cron/cron_block.sh` for the block with the local `/path/to/node`.

`yarn run cron:coin` - will fetch coin related information like price and supply from coinmarketcap.com.

`yarn run cron:masternode` - updates the masternodes list in the database with the most recent information clearing old information before.

`yarn run cron:peer` - gather the list of peers and fetch geographical IP information.

`yarn run cron:block` - will sync blocks and transactions by storing them in the database.

`yarn run cron:rich` - generate the rich list.

__Note:__ is is recommended to run all the crons before editing the crontab to have the information right away.  Follow the order above, start with `cron:coin` and end with `cron:rich`.

To setup the crontab please see run `crontab -e` to edit the crontab and paste the following lines (edit with your local information):
```
*/1 * * * * cd /path/to/Crypto-API && ./cron/cron_block.sh >> ./tmp/block.log 2>&1
*/1 * * * * cd /path/to/Crypto-API && /path/to/node ./scripts/masternode.js >> ./tmp/masternode.log 2>&1
*/1 * * * * cd /path/to/Crypto-API && /path/to/node ./scripts/peer.js >> ./tmp/peer.log 2>&1
*/1 * * * * cd /path/to/Crypto-API && /path/to/node ./scripts/rich.js >> ./tmp/rich.log 2>&1
*/5 * * * * cd /path/to/Crypto-API && /path/to/node ./scripts/coin.js >> ./tmp/coin.log 2>&1
```

## 📄 License

Crypto Api is MIT licensed, as found in the [LICENSE][l] file.

[l]: https://github.com/pinokara/Crypto-API/blob/master/LICENSE
