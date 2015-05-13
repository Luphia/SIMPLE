/*
	ifconfig -a eth0 | grep 'TX bytes'
	
	netstat -e
	@set a = netstat -an | find "TCP" /c
	@set b = netstat -an | find "UDP" /c
	
	var C = require('./monitor.network.js');
	var c = new C();
	
	var io = require('socket.io-client')('http://simple.tanpopo.cc/')
 */

var util = require('util'),	exec = require('child_process').exec;

var clone = function(target) {
	if(typeof(target) == 'object') {
		var rs = Array.isArray(target)? []: {};
		for(var key in target) {
			rs[key] = clone(target[key]);
		}
		return rs;
	}
	else {
		return target;
	}
};

var Collector = function() {
	this.init();
};

Collector.prototype.init = function() {
	var timestamp = new Date();
	this.limit = 300;
	this.period = 1000;
	this.session = [];
	this.rx = [];
	this.tx = [];
	this.rx.push({"byte": 0, "time": timestamp});
	this.tx.push({"byte": 0, "time": timestamp});

	for(var i = 1; i <= this.limit; i++) {
		var timestamp = new Date() - i * 1000;
		this.session.push(0);
		this.rx.push({"byte": 0, "time": timestamp});
		this.tx.push({"byte": 0, "time": timestamp});
	}
	
	var self = this;
	this.interval = setInterval(function() {
		self.collect();
	}, 1000);
};

Collector.prototype.collect = function() {
	var rx, tx, session;
	var self = this;
	exec("ifconfig -a | grep 'TX bytes'", function(err, data) {
		var dl = data.trim().split("\n");
		var drx = 0, dtx = 0;
		for(var i in dl) {
			var dt = dl[i].trim().split("  ");
			drx += parseInt(dt[0].substring(dt[0].indexOf(":")+1, dt[0].indexOf(" (")));
			dtx += parseInt(dt[1].substring(dt[1].indexOf(":")+1, dt[1].indexOf(" (")));
		}

		var time = new Date() * 1;
		rx = {"byte": drx, "time": time };
		tx = {"byte": dtx, "time": time };

		self.pushRX(rx);
		self.pushTX(tx);
	});

	exec("netstat | grep 'tcp\\|udp' | wc -l", function(err, data) {
		session = parseInt(data);
		self.pushSession(session);
	});
};

Collector.prototype.pushRX = function(data) {
	this.rx.unshift(data);
	this.rx.pop();
};
Collector.prototype.pushTX = function(data) {
	this.tx.unshift(data);
	this.tx.pop();
};
Collector.prototype.pushSession = function(data) {
	this.session.unshift(data);
	this.session.pop();
};

Collector.prototype.getCurrent = function() {
	var rx = parseInt((this.rx[0].byte - this.rx[1].byte) * 1000 / (this.rx[0].time - this.rx[1].time))
	,	tx = parseInt((this.tx[0].byte - this.tx[1].byte) * 1000 / (this.tx[0].time - this.tx[1].time))
	;
	
	if(!(rx > 0)) { rx = 0; }
	if(!(tx > 0)) { tx = 0; }

	var timestamp = this.rx[0].time * 1;
	var current = {
		"in": [rx, timestamp],
		"out": [tx, timestamp],
		"session": [this.session[0], timestamp]
	};
	
	return current;
};

Collector.prototype.getHistory = function() {
	var history = {
		"in": [],
		"out": [],
		"session": []
	};
	
	for(var i = 0; i < this.limit; i++) {
		var rx = parseInt((this.rx[i].byte - this.rx[i+1].byte) * 1000 / (this.rx[i].time - this.rx[i+1].time));
		var tx = parseInt((this.tx[i].byte - this.tx[i+1].byte) * 1000 / (this.tx[i].time - this.tx[i+1].time));
		
		if(!(rx > 0)) { rx = 0; }
		if(!(tx > 0)) { tx = 0; }
		var timestamp = this.rx[i].time * 1;
		
		history.in.push([rx, timestamp]);
		history.out.push([tx, timestamp]);
		history.session.push([this.session[i], timestamp]);
	}
	
	return history;
};

Collector.prototype.getSummary = function() {
	var summary = {
		"current": this.getCurrent(),
		"history": this.getHistory()
	};
	
	return summary;
};

module.exports = Collector;