#!/bin/bash
sudo npm install -g truffle
cd ~
wget https://cc-wei.com/release/baliv-offchain.tar
tar xvf baliv-offchain.tar
cd baliv-offchain
npm i
truffle migrate --network parity
