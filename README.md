# SIMPLE
SIMPLE backend framework

## Static Server
```shell
sudo npm i -g simple-backend
sudo simple /path/to/static/folder
```

## Create Server
### Create User
```shell
useradd <username>
passwd <username>
mkdir /home/<username>
chsh <username> -s /bin/bash
```
### Assign sudoer
```shell
visudo
```
```file
<username>    ALL=(ALL) ALL
```

### Install Library
#### CentOS
```code
sudo chown <username> -R ~/
sudo yum update
sudo yum install openssl libtool autoconf automake uuid-dev build-essential gcc gcc-c++ python-software-properties unzip make git libcap2-bin wget -y
```

#### Ubuntu
```code
sudo chown <username> -R ~/
sudo apt-get update
sudo apt-get install openssl libtool autoconf automake uuid-dev build-essential gcc g++ python-software-properties unzip make git libcap2-bin -y
```

#### Windows
https://nodejs.org/ - click install

### Install Node You can save in sh file and run it
```code
#!/bin/bash

NODE_FULLFILENAME=$(curl https://nodejs.org/dist/latest/SHASUMS256.txt | grep linux-x86.tar.gz | cut -d ' ' -f 3)
NODE_VERSION=$(echo $NODE_FULLFILENAME | cut -d '-' -f 2)
NODE_FILENAME="node-$NODE_VERSION-linux-x64"
PARENT_LOCATION="/opt/nodejs"

###
### Install NodeJS ###
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

sudo setcap cap_net_bind_service=+ep /opt/nodejs/$NODE_FILENAME/bin/node
```

### Deploy SIMPLE-SAMPLE
```code
npm install -g npm
git clone https://github.com/Luphia/SIMPLE/
cd SIMPLE
npm install
```

### Startup
```code
cd SIMPLE
node test
```
