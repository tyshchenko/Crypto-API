installNodeAndYarn () {
    echo "Installing nodejs and yarn..."
    sudo curl -sL https://deb.nodesource.com/setup_8.x | sudo bash -
    sudo apt-get install -y nodejs npm
    sudo curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | sudo apt-key add -
    sudo echo "deb https://dl.yarnpkg.com/debian/ stable main" | sudo tee /etc/apt/sources.list.d/yarn.list
    sudo apt-get update -y
    sudo apt-get install -y yarn
    sudo npm install -g pm2
    sudo ln -s /usr/bin/nodejs /usr/bin/node
    sudo chown -R explorer:explorer /home/explorer/.config
    clear
}
installMongo () {
    echo "Installing mongodb..."
    sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv 2930ADAE8CAF5059EE73BB4B58712A2291FA4AD5
    sudo echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.6 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-3.6.list
    sudo apt-get update -y
    sudo apt-get install -y --allow-unauthenticated mongodb-org
    sudo chown -R mongodb:mongodb /data/db
    sudo systemctl start mongod
    sudo systemctl enable mongod
    mongo bulwark --eval "db.createUser( { user: \"$rpcuser\", pwd: \"$rpcpassword\", roles: [ \"readWrite\" ] } )"
    mongo twins --eval "db.createUser( { user: \"$rpcuser\", pwd: \"$rpcpassword\", roles: [ \"readWrite\" ] } )"
    clear
}
installBulwark () {
    echo "Installing Bulwark..."
    mkdir -p /tmp/bulwark
    cd /tmp/bulwark
    curl -Lo bulwark.tar.gz $bwklink
    tar -xzf bulwark.tar.gz
    sudo mv ./bin/* /usr/local/bin
    cd
    rm -rf /tmp/bulwark
    mkdir -p /home/explorer/.bulwark

sudo cat > /home/explorer/.bulwark/bulwark.conf << EOL
rpcport=52544
rpcuser=$rpcuser
rpcpassword=$rpcpassword
daemon=1
txindex=1
EOL

sudo cat > /etc/systemd/system/bulwarkd.service << EOL
[Unit]
Description=bulwarkd
After=network.target
[Service]
Type=forking
User=explorer
WorkingDirectory=/home/explorer
ExecStart=/home/explorer/bin/bulwarkd -datadir=/home/explorer/.bulwark
ExecStop=/home/explorer/bin/bulwark-cli -datadir=/home/explorer/.bulwark stop
Restart=on-abort
[Install]
WantedBy=multi-user.target
EOL

    sudo systemctl start bulwarkd
    sudo systemctl enable bulwarkd
    echo "Sleeping for 1 hour while node syncs blockchain..."
    sleep 1h
    clear
}

installTwins() {
    echo "Installing Twins..."
    mkdir -p /tmp/twins
    cd /tmp/twins
    curl -Lo twins.tar.gz $twinslink
    tar -xzf twins.tar.gz
    sudo mv ./bin/* /usr/local/bin
    cd
    rm -rf /tmp/twins
    mkdir -p /home/explorer/.twins

cat > /home/explorer/.twins/twins.conf << EOL
rpcport=37818
rpcuser=$rpcuser
rpcpassword=$rpcpassword
daemon=1
txindex=1
EOL

sudo cat > /etc/systemd/system/twinsd.service << EOL
[Unit]
Description=twinsd
After=network.target
[Service]
Type=forking
User=explorer
WorkingDirectory=/home/explorer
ExecStart=/home/explorer/bin/twinsd -datadir=/home/explorer/.twins
ExecStop=/home/explorer/bin/twins-cli -datadir=/home/explorer/.twins stop
Restart=on-abort
[Install]
WantedBy=multi-user.target
EOL

    sudo systemctl start twinsd
    sudo systemctl enable twinsd
    echo "Sleeping for 1 hour while node syncs blockchain..."
    sleep 1h
    clear
}
installForever(){
    yarn install forever -g
}
installBlockEx () {
    echo "Installing BlockEx..."
    git clone https://github.com/crypto-critic/Crypto-API.git /home/explorer/blockex
    cd /home/explorer/blockex
    yarn install
    nodejs ./scripts/block.js
    nodejs ./scripts/coin.js
    nodejs ./scripts/masternode.js
    nodejs ./scripts/peer.js
    nodejs ./scripts/rich.js
    clear
cat > mycron << EOL
*/1 * * * * cd /home/explorer/blockex && ./shell-scripts/cron_block.sh >> ./tmp/block.log 2>&1
*/1 * * * * cd /home/explorer/blockex && /usr/bin/nodejs ./scripts/masternode.js >> ./tmp/masternode.log 2>&1
*/1 * * * * cd /home/explorer/blockex && /usr/bin/nodejs ./scripts/peer.js >> ./tmp/peer.log 2>&1
*/1 * * * * cd /home/explorer/blockex && /usr/bin/nodejs ./scripts/rich.js >> ./tmp/rich.log 2>&1
*/5 * * * * cd /home/explorer/blockex && /usr/bin/nodejs ./scripts/coin.js >> ./tmp/coin.log 2>&1
EOL
    crontab mycron
    rm -f mycron
    forever start ./server/index.js
    sudo pm2 startup ubuntu
}

# Setup
echo "Updating system..."
sudo apt-get update -y
sudo apt-get install -y apt-transport-https build-essential cron curl gcc git g++ make sudo vim wget
clear

# Variables
echo "Setting up variables..."
bwklink=`curl -s https://api.github.com/repos/bulwark-crypto/bulwark/releases/latest | grep browser_download_url | grep linux64 | cut -d '"' -f 4`
twinslink=`curl -s https://github.com/NewCapital/TWINS-Core/releases/download/twins_v3.2.2.2/twins-3.2.2.2-x86_64-linux-gnu.tar.gz`
rpcuser=`sha1`
rpcpassword=`sha1`
echo "BWk: $bwklink"
echo "User: $rpcuser"
echo "Pass: $rpcpassword"
sleep 5s
clear

installMongo
installBulwark
installTwins
installNodeAndYarn
installForever
installBlockEx