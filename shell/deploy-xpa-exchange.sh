#!/bin/bash

TRUFFLE_PATH=$(sudo npm i -g truffle | grep truffle | cut -d ' ' -f 1) | grep truffle
sudo ln -s $TRUFFLE_PATH /usr/local/bin
cd ~
wget https://cc-wei.com/release/baliv-offchain.tar
tar xvf baliv-offchain.tar
cd baliv-offchain
npm i
truffle migrate --network parity
