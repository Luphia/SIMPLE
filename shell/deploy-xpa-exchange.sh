#!/bin/bash
TRUFFLE_PATH = $(sudo npm install -g truffle)
echo $TRUFFLE_PATH
cd ~
wget https://cc-wei.com/release/baliv-offchain.tar
tar xvf baliv-offchain.tar
cd baliv-offchain
npm i
truffle migrate --network parity
