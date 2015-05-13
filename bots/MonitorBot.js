var ParentBot = require('./_SocketBot.js')
,	util = require('util')
,	os = require('os')
,	async = require('async')
,	njds = require('../classes/disks.js')
,	Collector = require('../classes/monitor.network4Linux.js')
,	Result = require('../classes/Result.js')
,	request = require('request');

var Bot = function(config) {
	if(!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function(config) {
	Bot.super_.prototype.init.call(this, config);
	this.path = [{method: "get", path: "/info/"}];
	this.diskInfo = {};
	this.monitorData = {};
};

Bot.prototype.start = function() {
	Bot.super_.prototype.start.apply(this);

	var self = this;
	var collector = new Collector();
	var now = new Date() - 10000;

	// 先執行一次，之後每分鐘執行一次。(系統啟動時才執行，以利取得系統資訊。)
	console.log("初始化抓取系統資訊...");
	self.monitorData = self.info(collector);
	
	// 每隔一分鐘執行一次
	setInterval(function() {
		var curr = new Date();
		if(curr > now + 10000 ) {
			now += 10000;
			//console.log(collector.getCurrent());
			self.monitorData = self.info(collector);
		}
	}, 60000);
};

Bot.prototype.stop = function() {
	Bot.super_.prototype.stop.apply(this);
};

Bot.prototype.exec = function(msg) {
	var rs = new Result();

	console.log("-------- [GET] Monitoring OS State --------");
	console.log(this.monitorData);
	
	rs.setResult(1);
	rs.setMessage('Get System Information');
	rs.setData(this.monitorData);

	return rs;
};

/**
 * 取得系統資訊
 */
Bot.prototype.info = function(collector) {
	// cpu
	//Initialise sum of idle and time of cores and fetch CPU info
	var totalIdle = 0, totalTick = 0;
	var cpus = os.cpus();

	//Loop through CPU cores
	for(var i = 0, len = cpus.length; i < len; i++) {
		//Select CPU core
		var cpu = cpus[i];

		//Total up the time in the cores tick
		for(type in cpu.times) {
			totalTick += cpu.times[type];
		}     

		//Total up the idle time of the core
		totalIdle += cpu.times.idle;
	}
	
	// memory
	var memLoading = (os.totalmem() - os.freemem()) / os.totalmem();
	
	// network & session
	var sessionData = collector.getCurrent().session;
	var netInData = collector.getCurrent().in;
	var netOutData = collector.getCurrent().out;
	
	// disk 純Linux
	njds.drives(
		function (err, drives) {
			njds.drivesDetail(
				drives,
				function (err, data) {
					var diskInfoTemp = {};
					var totalDisk = 0, totalAvailable = 0, totalUsed = 0;
					for(var i = 0; i<data.length; i++) {
						// Get drive mount point
						//console.log(data[i].mountpoint);

						// Get drive total space
						//console.log(data[i].total);

						// Get drive used space
						//console.log(data[i].used);

						// Get drive available space
						//console.log(data[i].available);

						// Get drive name
						//console.log(data[i].drive);

						// Get drive used percentage
						//console.log(data[i].usedPer);

						// Get drive free percentage
						//console.log(data[i].freePer);
						
						// 容量單位換算後做加總
						totalDisk += convertDiskCapacity(data[i].total);
						totalAvailable += convertDiskCapacity(data[i].available);
						totalUsed += convertDiskCapacity(data[i].used);
					}

					diskInfoTemp = {
						"Loading": parseInt(totalUsed) / parseInt(totalDisk),
						"Total": parseInt(totalDisk),
						"Remain": parseInt(totalAvailable)
					};
					//console.log("---disk---");
					//console.log(diskInfoTemp);
					setDiskInfo(diskInfoTemp);
				}
			);
		}
	);

	var monitorData = {
		"OS Name": os.type(),
		"PLATFORM": os.platform(),
		"CPU": {
			"Loading": os.loadavg()[0], 
			"Total": totalTick,
			"Remain": totalIdle
		},
		"RAM": {
			"Loading": memLoading, 
			"Total": os.totalmem(),
			"Remain": os.freemem()
		},
		"DISK": getDiskInfo(),
		"SESSION": sessionData[0],
		"NETWORK": {
			"IN": netInData[0], 
			"OUT": netOutData[0]
		}
	};
	
	console.log("-------- Monitoring OS State --------");
	console.log(monitorData);
	return monitorData;
};

var setDiskInfo = function(dInfo) {
	this.diskInfo = dInfo;
};

var getDiskInfo = function() {
	return this.diskInfo;
};

/**
 * 儲存容量單位換算
 * @param diskCapacity 硬碟容量資料(字串)，如：『23 GB』這個字串。
 * return 換算成bytes後回傳一個數值
 */
var convertDiskCapacity = function(diskCapacity) {
	var value = diskCapacity.split(" ")[0];
	var unit = diskCapacity.split(" ")[1];
	var result = 0.0;
	
	switch(unit) {
		case 'GB':
			result = parseFloat(value) * 1024 * 1024 * 1024;
			break;
		case 'MB':
			result = parseFloat(value) * 1024 * 1024;
			break;
		case 'KB':
			result = parseFloat(value) * 1024;
			break;
		default:
			result = 0.0;
			break;
	}
	
	return result;
};

module.exports = Bot;