/* test case

var BOT = require('./bots/_Bot.js');
var bot = new BOT();

bot.addJob('a', 1, function(e, d) { console.log('finish job a'); console.log(d); })
bot.addJob('b', 1, function(e, d) { console.log('finish job b'); console.log(d); });
bot.addJob('b', 1);
bot.done('b', {"msg": "Hi!"});
bot.done('a', {"msg": "Yo!"});
bot.addJob('b', 1);
bot.done('b', {"msg": "How!"});
bot.done('b', {"msg": "Are!"});
bot.done('b', {"msg": "You!"});

*/

var child_process = require('child_process')
,	Result = require('../classes/Result.js')
;

var Bot = function(config) {
	this.init(config);
};

Bot.prototype.init = function(config) {
	config && (this.config = config);
	this.active = false;
	this.waiting = {};
	this.result = {};
	this.callback = {};

	if(!!config) {
		this.db = config.db;
	}
};

Bot.prototype.start = function(callback) {
	this.active = true;

	if(typeof(callback) == 'function') { callback(); }
};

Bot.prototype.stop = function() {
	this.active = false;
};

Bot.prototype.reset = function() {
	this.stop();
	this.init(this.config);
	this.start();
};

Bot.prototype.cbReturn = function(err, data, callback) {
	if(typeof(callback) != 'function') {
		callback = function(err, data) {
			// err && (console.log(err));
			// data && (console.log(data));
		};
	}

	callback(err, data);
};

Bot.prototype.cmd = function(command, callback) {
	var self = this;
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

		self.cbReturn(err, stdout, callback);
	});
};

Bot.prototype.exec = function(command, callback) {
	command = this.translate(command);
	if(typeof(this.work) == 'function') {
		this.work(command, callback);
	}
	else {console.log(command);//--
		callback(false, command);
	}
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
Bot.prototype.addJob = function(event, n, callback) {
	if(!event) { event = "_job"; }
	if(!this.waiting[event]) { this.initEvent(event); }

	this.waiting[event] += n > 0? n: 1;

	if(typeof(callback) == 'function') {
		this.callback[event] = callback;
	}
};

Bot.prototype.done = function(event, data) {
	if(!event) { event = "_job"; }
	if(!this.waiting[event]) { return false; }
	if(data) { this.result[event].push(data); }

	this.waiting[event] --;
	this.waiting[event] = this.waiting[event] < 0? 0: this.waiting[event];

	if(this.waiting[event] == 0) {
		if(this.result[event].length == 1) { this.result[event] = this.result[event][0]; }
		this.cbReturn(false, this.result[event], this.callback[event]);
		this.cleanEvent(event);
	}
};

Bot.prototype.cleanEvent = function(event) {
	if(!event) { event = "_job"; }
	if(!this.waiting[event]) { return false; }

	delete this.result[event];
	delete this.waiting[event];
	return true;
};

module.exports = Bot;
