#!/bin/bash

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
