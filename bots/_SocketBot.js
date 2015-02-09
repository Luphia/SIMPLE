/*

var SB = require('./bots/_SocketBot.js');
var a = new SB({"tags": ["t1","t2"]});
var b = new SB({"tags": ["t2","t3"]});
var c = new SB({"tags": ["t3","t4"]});
a.start();
b.start();
c.start();
c.broadcast('yo', 't1', 100);

 */

var Bot = require('./_Bot.js')
,	util = require('util');

var SocketBot = function(config) {
	if(!config) config = {};
	this.init(config);
};

util.inherits(SocketBot, Bot);

SocketBot.prototype.init = function(config) {
	config = config || {};
	SocketBot.super_.prototype.init.call(this, config);
	this.server = config.server || 'ws://127.0.0.1:2266';
	this.tags = config.tags || [];
};

SocketBot.prototype.start = function() {
	if(this.active) { return; }
	var self = this;
	SocketBot.super_.prototype.start.apply(this);
	this.socket = require('socket.io-client')(this.server, {'force new connection': true});

	this.tag(this.tags);

	this.socket.on('message', function(msg) {
		if(msg._response) {
			self.getResponse(msg);
		}
		else {
			self.get(msg);
		}
	});

	this.socket.on('wait', function(msg) {
		self.addJob(msg._id, msg.jobs);
		self.done(msg._id);
	});
};

SocketBot.prototype.stop = function() {
	Coordinator.super_.prototype.stop.apply(this);
	this.socket.disconnect();
};

SocketBot.prototype.tag = function(tag) {
	if(Array.isArray(tag)) {
		for(var k in tag) {
			this.tag(tag[k]);
		}

		return true;
	}

	if(this.tags.indexOf(tag) == -1) { this.tags.push(tag); }
	if(this.socket) { this.socket.emit('tag', tag); }
	return true;
};

SocketBot.prototype.untag = function() {
	this.tags = [];
	this.socket.emit('untag');
};

SocketBot.prototype.send = function(msg, option) {
	if(typeof msg != 'object') {
		msg = {"data": msg};
	}

	msg._id = this.randomID();
	msg._option = option;

	this.socket.emit('message', msg);

	if(option.waiting) {
		this.initEvent(msg._id);
		this.addJob(msg._id);
		return this.wait(msg._id);
	}
};

SocketBot.prototype.broadcast = function(msg, tags, response) {
	var option = {
		"method": "broadcast",
		"tag": tags
	};

	if(response) {
		option.waiting = true;
	}

	return this.send(msg, option);
};

SocketBot.prototype.peer = function(msg, clients, response) {
	var option = {
		"method": "peer",
		"peer": clients
	}

	if(response) {
		option.waiting = true;
	}

	return this.send(msg, option);
};

SocketBot.prototype.random = function(msg, num, tags, response) {
	var option = {
		"method": "random",
		"num": num,
		"tag": tags
	};

	if(response) {
		option.waiting = true;
	}

	return this.send(msg, option);
};

SocketBot.prototype.get = function(message) {
	if(message._command) {
		this.exec(message);
	}
	else {
		console.log('I got message: %s', JSON.stringify(message));
		this.response("OK!", message);
	}
};
SocketBot.prototype.getResponse = function(message) {
	this.done(message._response, message);
	// console.log('I got response: %s', JSON.stringify(message))
};

SocketBot.prototype.response = function(msg, oldMsg) {
	if(!oldMsg._from) { return false; }
	if(typeof msg != 'object') { msg = {"data": msg}; }
	msg._id = oldMsg._id;
	msg._response = oldMsg._id;
	this.peer(msg, oldMsg._from);
};

SocketBot.prototype.record = function(table, data) {
	var message = {
		"table": table,
		"data": data
	};

	this.random(message, 1, 'recorder');
};

module.exports = SocketBot;