#!/bin/bash

cd ~
mkdir geth-xpaexchange
cd geth-xpaexchange
PW=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
PUBLIC_KEY=$((geth --datadir ~/geth-xpaexchange/ account new <<!
$PW
$PW
!
) | grep Address | cut -d '{' -f 2 | cut -d '}' -f 1 )
echo $PW > .pw
echo '
{
"alloc" : { "$PUBLIC_KEY": { "balance": "0x33b2e3c9fd0804000000000" } },
"coinbase" : "0x$PUBLIC_KEY",
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
