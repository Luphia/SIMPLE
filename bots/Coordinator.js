/*
option
	method: broadcast,	peer,	random
	peer:
	tag
	num
 */

var Bot = require('./_Bot.js')
,	util = require('util')
,	crypto = require('crypto');

var distinct = function(value, index, self) { 
	return self.indexOf(value) === index;
}
,	randomPick = function(arr, n) {
	var rs = [];
	if(!Array.isArray(arr)) { return rs }
	if(n >= arr.length) { return arr; }
	
	while(rs.length < n) {
		var p = arr[ Math.floor(Math.random() * arr.length) ];
		if(rs.indexOf(p) == -1) { rs.push(p); }
	}

	return rs;
};

var Coordinator = function(config) {
	this.init(config);
};

util.inherits(Coordinator, Bot);

Coordinator.prototype.init = function(config) {
	Coordinator.super_.prototype.init.call(this, config);
	this.tags = {};
	this.clients = [];
};

Coordinator.prototype.start = function() {
	Coordinator.super_.prototype.start.apply(this);
	var self = this;
	this.io = require('socket.io')(2266, {
		"pingInterval": 600000,
		"pingTimeout": 600000
	});

	this.io.on('connection', function(socket) {
		var client = socket.client.id;
		self.addClient(client);
		socket.on('disconnect', function() {
			self.removeClient(socket.client.id);
		});
		socket.on('tag', function(data) {
			self.tag(client, data);
		});
		socket.on('untag', function() {
			self.untag(client);
		});
		socket.on('message', function(data) {
			self.message(client, data);
		});
	});
};

Coordinator.prototype.stop = function() {
	Coordinator.super_.prototype.stop.apply(this);
	this.io.close();
};

Coordinator.prototype.messageID = function(message) {
	if(message._id) {
		return message._id;
	}

	if(typeof message == 'object') {
		message = JSON.stringify(message);
	}

	return crypto.createHash('sha1').update(message).digest('hex');
}

Coordinator.prototype.addClient = function(client) {
	if(this.clients.indexOf(client) == -1) {
		this.clients.push(client);
	}
};
Coordinator.prototype.removeClient = function(client) {
	this.untag(client);
	this.clients.splice(this.clients.indexOf(client), 1);
};

Coordinator.prototype.tag = function(client, tag) {
	if(Array.isArray(tag)) {
		for(var k in tag) {
			this.tag(client, tag[k]);
		}
	}

	if(!this.tags[tag]) {
		this.tags[tag] = [];
	}

	if(this.tags[tag].indexOf(client) == -1) {
		this.tags[tag].push(client);
	}
};

Coordinator.prototype.untag = function(client) {
	for(var k in this.tags) {
		this.tags[k].splice(this.tags[k].indexOf(client), 1);
	}
};

Coordinator.prototype.message = function(client, message) {
	if(typeof message != 'object' || Array.isArray(message)) {
		message = {"data": message};
	}

	message._option = message._option || {};
	message._id = this.messageID(message);
	message._from = client;

	var targets = this.getTargets(message._option);

	if(message._option.waiting) {
		this.io.to(client).emit('wait', {
			"_id": message._id,
			"jobs": targets.length
		});
	}
	delete message._option;

	this.send(targets, message);
};

Coordinator.prototype.getTargets = function(option) {
	if(!option) { return []; }
	var target = []
	,	peer = option.peer
	,	num = parseInt(option.num)
	,	tag = option.tag;

	if(peer && !Array.isArray(peer)) { peer = [peer]; }
	if(tag && !Array.isArray(tag)) { tag = [tag]; }
	if(!(num > 0)) { num = 1; }

	switch(option.method) {
		case 'broadcast':
			if(tag) {
				for(var k in tag) {
					this.tags[tag[k]] && (target = target.concat(this.tags[tag[k]]));
				}
			}
			else {
				target = this.clients;
			}
			break;

		case 'peer':
			target = peer;
			break;

		case 'random':
			target = this.random(num, tag);
			break;
	}

	return target;
};

Coordinator.prototype.random = function(num, tag) {
	if(!tag) {
		return randomPick(this.clients, num);
	}
	else if(Array.isArray(tag)) {
		var rs = [];
		for(var k in tag) {
			rs = rs.concat(this.random(num, tag[k]));
		}
		return rs.filter(distinct);
	}
	else {
		var rs = [];
		if(this.tags[tag]) {
			rs = randomPick(this.tags[tag], num);
		}
		return rs;
	}
};

Coordinator.prototype.send = function(targets, message) {
	for(var k in targets) {
		this.io.to(targets[k]).emit('message', message);
	}
};

module.exports = Coordinator;