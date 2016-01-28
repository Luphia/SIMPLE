const ParentBot = require('./_Bot.js');
const util = require('util');
const http = require('http');
const url = require('url');
const BorgRing = require('borg-ring');
const dvalue = require('dvalue');
const Result = require('../classes/Result.js');

var nodeEncode = function(node) {
	node = node || {};
	var rs;
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	if(Array.isArray(node)) {
		rs = [];
		for(var i = 0; i < node.length; i++) {
			var code = nodeEncode(node[i]);
			if(code) { rs.push(code); }
		}
	}
	else if(format.test(node.client) && node.ip && node.port) {
		rs = node.ip + ":" + node.port + ":" + node.client;
	}
	else {}

	return rs;
};
var nodeDecode = function(data) {
	var rs, tmp;
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
	if(typeof data != 'string') { return false; }

	tmp = data.split(":");
	if(tmp.length != 3 || !format.test(tmp[2])) { return false; }

	node = {
		ip: tmp[0],
		port: tmp[1],
		client: tmp[2]
	};

	return node;
};

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
	this.nodes = [];
	this.nodeIndex = {};
};

util.inherits(Bot, ParentBot);

Bot.prototype.start = function() {
	Bot.super_.prototype.start.apply(this);
	this.loadNode();
};

Bot.prototype.exec = function(msg, callback) {
	var self = this;
	var path = msg.url;
	var method = msg.method? msg.method.toLowerCase(): '';
	var client = msg.params.client;
	var fetch = msg.query? msg.query.fetch: undefined;

	var node = {
		client: client,
		port: msg.query.port || 5566,
		ip: msg.query.ip || msg.session.ip
	};
	if(node.ip == "::1") { node.ip = "127.0.0.1"; }

	var rs;
	switch(method) {
		case 'get':
			if(/^\/node\//.test(path)) {
				rs = new Result();
				rs.setResult(1);
				rs.setData(node);
				if(!this.exist(node)) {
					this.testNode(node, function(err) {
						if(!err) {
							self.addNode(node);
						}
					});

					rs.setMessage('Access from ' + node.ip);
					if(typeof callback == 'function') { callback(false, rs.toJSON()); }
				}
				else {
					this.testNode(node, function(err) {
						if(!err) {
							self.updateNode(node);
						}
					});

					rs.setMessage('Access from ' + node.ip);
					if(typeof callback == 'function') { callback(false, rs.toJSON()); }
				}
			}
			else if(/^\/track\//.test(path)) {
				var rs = new Result();
				rs.setResult(1);
				rs.setMessage('fetch nodes');
				rs.setData(this.findNode());
				if(typeof callback == 'function') { callback(false, rs.toJSON()); }
			}
			else if(/^\/kick\//.test(path)) {
				var rs = new Result();
				rs.setResult(1);
				rs.setMessage('kick nodes');
				this.removeNode(client);
				if(typeof callback == 'function') { callback(false, rs.toJSON()); }
			}
			else {
				rs.setResult(1);
				rs.setMessage('fetch nodes');
				rs.setData(this.findNode());
				if(typeof callback == 'function') { callback(false, rs.toJSON()); }
			}
			break;

		case 'post':
			rs = new Result();
			rs.setResult(1);
			rs.setData(this.findNode());

			this.testNode(node, function(err) {
				if(!err) { self.addNode(node); }
				if(typeof callback == 'function') { callback(false, rs.toJSON()); }
			});
			break;

		case 'put':
			rs = this.updateNode(node);
			if(typeof callback == 'function') { callback(false, rs.toJSON()); }
			break;

		default:
			rs = this.command(msg);
			if(typeof callback == 'function') { callback(false, rs.toJSON()); }
			break;
	}

	return rs;
};
Bot.prototype.command = function(msg) {
	var rs;
	switch(msg.cmd) {
		case 'getBorgRing':
			rs = this.getBorgRing();
			break;
	}

	return rs;
};
Bot.prototype.testNode = function (node, callback) {
	var self = this;
	if(!node.client) { return false; }

	var testOPT = {
		protocol: "http",
		hostname: node.ip,
		port: node.port,
		pathname: "client/"
	};

	var test = url.format(testOPT);

	var req = http.get(test, function(res) {
		var result = "";

		res.on('error', function(e) {
			console.log("Got error: " + e.message);
		});

		res.on('data', function(d) {
			if(d) result += d;
		});

		res.on('end', function() {
			try {
				var rs = JSON.parse(result);
				node.owner = rs.data.owner
				callback(rs.data.identify != node.client);
			}
			catch(e) {
				callback(e);
				console.error(e);
			}
		});
	});
	req.on('error', function (e) {
		callback(e);
		console.log('test failed', node.ip, node.port, node.client);
	});
};
Bot.prototype.pushMachine = function (owner) {
	var self = this;
	this.ecdb.listData('nodes', "owner='" + owner + "'", function(e, d) {
		if(e || d.length == 0) { return false; }
		var list = nodeEncode(d);
		var dataString = JSON.stringify(list);
		d.map(function (v, k) {
			var pushOPT = {
				hostname: v.ip,
				port: v.port,
				path: "/machines/",
				method: "POST",
				headers: {
					'Content-Type': 'application/json; charset=utf-8',
					'Content-Length': dataString.length
				}
			};
			var request = http.request(pushOPT, function(res) {
				res.on('data', function(body) {
					//console.log(new String(body));
				});
			});
			//request.setHeader('Content-Type', 'application/json;');
			//request.setHeader('Content-Length', dataString.length);
			request.on('error', function(e) {});
			request.write(dataString);
			request.end();
		});
	});
};
Bot.prototype.loadNode = function () {
	var self = this;

	this.ecdb.listData('nodes', {}, function(e, d) {
		self.nodes = d;
		for(var k in d) {
			self.nodeIndex[ d[k].client ] = k;
		}
	});
};
Bot.prototype.addNode = function(node) {
	var result = new Result();
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

	if(format.test(node.client)) {
		this.nodeIndex[node.client] = (this.nodes.push(node) - 1);
		result.setResult(1);
		result.setMessage('add node: ' + node.client);

		// write db
		this.ecdb.postData('nodes', node, function(e, d) { node._id = d; });
	}
	else {
		result.setResult(0);
		result.setMessage('Invalid node');
	}

	return result;
};
Bot.prototype.buildIndex = function () {
	var self = this;
	this.nodes.map(function(v, k) {
		self.nodeIndex[v.client] = k;
	});
};
Bot.prototype.removeNode = function (node) {
	node = new String(node);
	var index = this.nodeIndex[node];
	if(index > -1) {
		this.nodes.splice(index, 1);
		this.buildIndex;
		this.ecdb.deleteData('nodes', "client = '" + node + "'", function(e, d) { node._id = d; });
	}
};
Bot.prototype.updateNode = function(node) {
	var result = new Result();
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

	if(format.test(node.client) && this.nodes[ this.nodeIndex[node.client] ]._id) {
		var dirty = false;

		if(node.owner) {
			this.pushMachine(node.owner);
		}

		for(var k in node) {
			if(new RegExp("^_").test(k)) { continue; }
			if(this.nodes[ this.nodeIndex[node.client] ][k] == node[k]) { continue; }
			else {
				dirty = true;
				this.nodes[ this.nodeIndex[node.client] ][k] = node[k];
			}
		}
		result.setResult(1);
		result.setMessage('update node: ' + node.client);

		if(dirty) {
			// write db
			this.ecdb.putData('nodes', this.nodes[ this.nodeIndex[node.client] ]._id, node, function() {});
		}
	}
	else {
		result.setResult(0);
		result.setMessage('Invalid node');
	}

	return result;
};
Bot.prototype.findNode = function(n) {
	var n = parseInt(n);
	var result = n > 0? nodeEncode(dvalue.randomPick(this.nodes, n)): nodeEncode(this.nodes);

	return result;
};
Bot.prototype.getBorgRing = function() {
	var br = new BorgRing();
	var nodes = this.findNode();
	for(var k in nodes) {
		br.addNode(nodes[k]);
	}

	return br;
};
Bot.prototype.exist = function(node) {
	return (this.nodeIndex[node.client] >= 0);
};

module.exports = Bot;
