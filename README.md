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
sudo apt-get install openssl libtool autoconf automake uuid-dev build-essential gcc g++ software-properties-common unzip make git libcap2-bin -y
```

#### Windows
https://nodejs.org/ - click install

### Install Node You can save in sh file and run it
```shell
bash <(curl https://raw.githubusercontent.com/Luphia/SIMPLE/master/shell/install-env.sh -kL)
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
