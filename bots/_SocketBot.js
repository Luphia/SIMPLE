/*

var SB = require('./bots/SocketBot.js');
var a = new SB({"tags": ["t1","t2"]});
var b = new SB({"tags": ["t2","t3"]});
var c = new SB({"tags": ["t3","t4"]});
a.start();
b.start();
c.start();
c.broadcast('yo', 't1');

 */

var Bot = require('./_Bot.js')
,	util = require('util');

var SocketBot = function(config) {
	if(!config) config = {};
	this.init(config);
};

util.inherits(SocketBot, Bot);

SocketBot.prototype.init = function(config) {
	SocketBot.super_.prototype.init.call(this, config);
	this.server = config.server || 'ws://127.0.0.1';
	this.tags = config.tags || [];
};

SocketBot.prototype.start = function() {
	if(this.active) { return; }
	var self = this;
	SocketBot.super_.prototype.start.apply(this);
	this.socket = require('socket.io-client')(this.server, {'force new connection': true});

	this.tag(this.tags);

	this.socket.on('message', function(msg) {
		self.get(msg);
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
	this.socket.emit('tag', tag);
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
};

SocketBot.prototype.broadcast = function(msg, tags) {
	var option = {
		"method": "broadcast",
		"tag": tags
	};

	this.send(msg, option);
};

SocketBot.prototype.peer = function(msg, clients) {
	var option = {
		"method": "peer",
		"peer": clients
	}

	this.send(msg, option);
};

SocketBot.prototype.random = function(msg, num, tags) {
	var option = {
		"method": "random",
		"num": num,
		"tag": tags
	};

	this.send(msg, option);
};

SocketBot.prototype.get = function(message) {
	if(message._command) {
		this.command(message);
	}
	else {
		console.log('I got message: %s', JSON.stringify(message));
	}
};

SocketBot.prototype.response = function(msg, oldMsg) {
	if(!oldMsg._from) { return false; }
	if(typeof msg != 'object') { msg = {"data": msg}; }
	msg._id = oldMsg._id;
	this.peer(msg, oldMsg._from);
};

module.exports = SocketBot;