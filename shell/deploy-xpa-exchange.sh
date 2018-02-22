#!/bin/bash

IAM=$(whoami)

sudo swapon -s
free -m
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
sudo apt-get update
sudo apt-get install openssl libtool autoconf automake uuid-dev build-essential gcc g++ python-software-properties unzip make git libcap2-bin -y

sudo add-apt-repository ppa:longsleep/golang-backports
sudo apt-get update
sudo apt-get install golang-go

NODE_FULLFILENAME=$(curl https://nodejs.org/dist/latest/SHASUMS256.txt | grep linux-x86.tar.gz | cut -d ' ' -f 3)
NODE_VERSION=$(echo $NODE_FULLFILENAME | cut -d '-' -f 2)
NODE_FILENAME="node-$NODE_VERSION-linux-x64"
PARENT_LOCATION="/opt/nodejs"

###
### Install NodeJS & PM2 ###
###

### Download NodeJS ###
cd /usr/local/src
sudo wget -nc http://nodejs.org/dist/$NODE_VERSION/$NODE_FILENAME.tar.gz
#wget -E -H -k -K -p http:///
sudo tar zxvf $NODE_FILENAME.tar.gz
sudo mkdir -p $PARENT_LOCATION
sudo mv $NODE_FILENAME $PARENT_LOCATION/

### Link binary files ###
rm -f /usr/local/bin/node
rm -f /usr/local/bin/npm
sudo ln -s $PARENT_LOCATION/$NODE_FILENAME/bin/node /usr/local/bin
sudo ln -s $PARENT_LOCATION/$NODE_FILENAME/bin/npm /usr/local/bin

### assign 80 & 443 port ###
sudo setcap cap_net_bind_service=+ep /opt/nodejs/$NODE_FILENAME/bin/node

### Install PM2
sudo npm install -g pm2
sudo ln -s /opt/nodejs/node-$NODE_VERSION-linux-x64/lib/node_modules/pm2/bin/pm2 /usr/local/bin/

### Install SIMPLE
sudo npm install -g simple-backend
sudo ln -s /opt/nodejs/node-$NODE_VERSION-linux-x64/lib/node_modules/simple-backend/bin/simple.js /usr/local/bin/simple

### Install Truffle
sudo npm install -g truffle
sudo ln -s /opt/nodejs/node-$NODE_VERSION-linux-x64/bin/truffle /usr/local/bin

### Download and build GETH
cd ~
git clone https://github.com/ethereum/go-ethereum
cd go-ethereum
make geth
sudo ln -s ~/go-ethereum/build/bin/geth /usr/local/bin/

cd ~
mkdir geth-xpaexchange
cd geth-xpaexchange
PW=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
PUBLIC_KEY=$((geth --datadir ~/geth-xpaexchange/ account new << EOF
$PW
$PW
EOF
) | grep Address | cut -d '{' -f 2 | cut -d '}' -f 1 )
echo $PW > .pw
echo $PUBLIC_KEY
echo '
{
"alloc" : { "'"$PUBLIC_KEY"'": { "balance": "0x33b2e3c9fd0804000000000" } },
"coinbase" : "0x'"$PUBLIC_KEY"'",
"difficulty" : "0x2000",
"extraData" : "",
"gasLimit" : "0x5d8b80",
"nonce" : "0x0000000000000000",
"mixhash" : "0x0000000000000000000000000000000000000000000000000000000000000000",
"parentHash" : "0x0000000000000000000000000000000000000000000000000000000000000000",
"timestamp" : "0x00",
"config": {
"chainId": 1,
"homesteadBlock": 0,
"eip155Block": 0,
"eip158Block": 0
}
}
' > ./genesis.json
geth --datadir ~/geth-xpaexchange init ~/geth-xpaexchange/genesis.json
nohup geth --mine --minerthreads=4 --maxpeers 10 --cache=2048 --datadir ~/geth-xpaexchange/ --rpc --rpcaddr 0.0.0.0 --rpcport 8745 --rpcapi db,eth,net,web3,personal --rpccorsdomain * --etherbase $PUBLIC_KEY --unlock 0x$PUBLIC_KEY --password ~/baliv-geth/.pw --port 30301 &

### Get IP
echo "const x=$(curl http://cc-wei.com/ping);console.log(x.data.session.ip);" > pingpong.js
IP=$(node pingpong.js)
rm pingpong.js

### Deploy XPA Exchange
cd /etc
sudo wget http://cc-wei.com/release/baliv-offchain.tar
sudo tar xvf baliv-offchain.tar
rm baliv-offchain.tar
sudo chown -R $IAM /etc/baliv-offchain
cd baliv-offchain
sed -i "s%{IP}%$IP%g" ./config/default.main.config
npm i
{
  CONTRACT_LIST=$(truffle migrate --network parity)
}
nohup node . &

echo "
$CONTRACT_LIST
RPC server: http://$IP:8745
myEtherWallet: http://$IP/etherwallet
XPA Exchange: http://$IP/xpaexchange
"
