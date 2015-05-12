var child_process = require('child_process');

var Bot = function(config) {
	this.init(config);
};

Bot.prototype.init = function(config) {
	config && (this.config = config);
	this.active = false;
	this.waiting = {};
	this.result = {};
};

Bot.prototype.start = function() {
	this.active = true;
};

Bot.prototype.stop = function() {
	this.active = false;
};

Bot.prototype.reset = function() {

};

Bot.prototype.cmd = function(command) {
	var rs;
	var options = {
		encoding: 'utf8',
		timeout: 0,
		maxBuffer: 200*1024,
		killSignal: 'SIGTERM',
		cwd: null,
		env: null
	};
	child_process.exec(command, options, function(err, stdout, stderr) {
		if(err) { console.log(err); }
		if(stderr) { console.log(stderr); }
		rs = stdout;
	});

	while(rs === undefined) {
		require('deasync').runLoopOnce();
	}

	return rs;
};

Bot.prototype.exec = function(command) {
	command = this.translate(command);
	// do something
};

Bot.prototype.randomID = function(n) {
	var string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	,	l = parseInt(n) || 8
	,	rs = "";
	for(var i = 0; i < l; i++) {
		rs += string[ Math.floor(Math.random() * string.length) ];
	}
	return rs;
};

Bot.prototype.clone = function(target) {
	if(typeof(target) == 'object') {
		var rs = Array.isArray(target)? []: {};
		for(var key in target) {
			rs[key] = this.clone(target[key]);
		}
		return rs;
	}
	else {
		return target;
	}
};

Bot.prototype.translate = function(command) {
	return command;
};

Bot.prototype.initEvent = function(event) {
	if(!event) { event = "_job"; }
	this.waiting[event] = 0;
	this.result[event] = [];
};
Bot.prototype.addJob = function(event, n) {
	if(!event) { event = "_job"; }
	if(!this.waiting[event]) { this.initEvent(event); }

	this.waiting[event] += n > 0? n: 1;
};

Bot.prototype.done = function(event, data) {
	if(!event) { event = "_job"; }
	if(!this.waiting[event]) { return false; }
	if(data) { this.result[event].push(data); }

	this.waiting[event] --;
	this.waiting[event] = this.waiting[event] < 0? 0: this.waiting[event];
};

Bot.prototype.wait = function(event) {
	if(!event) { event = "_job"; }
	if(typeof this.waiting[event] == "undefined") { return false; }
	var now = new Date()
	,	timeout = new Date() * 1 + 10000;

	while(this.waiting[event] > 0 && now < timeout) {
		require('deasync').runLoopOnce();
		now = new Date();
	}

	var rs;
	if(now < timeout) {
		rs = this.clone(this.result[event]);
		if(rs.length == 1) { rs = rs[0]; }
	}
	else {
		rs = false;
		console.log("%s timeout", event);
	}
	this.cleanEvent(event);
	return rs;
};

Bot.prototype.cleanEvent = function(event) {
	if(!event) { event = "_job"; }
	if(!this.waiting[event]) { return false; }

	delete this.result[event];
	delete this.waiting[event];
	return true;
};

module.exports = Bot;