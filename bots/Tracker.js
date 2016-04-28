const ParentBot = require('./_Bot.js');
const util = require('util');
const http = require('http');
const url = require('url');
const BorgRing = require('borg-ring');
const dvalue = require('dvalue');
const mongodb = require('mongodb');
const Result = require('../classes/Result.js');

var period = 86400000 * 7;
var alive = 60000;

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
	this.subdomain = [];
	this.subdomainIndex = {};
};

util.inherits(Bot, ParentBot);

Bot.prototype.start = function() {
	Bot.super_.prototype.start.apply(this);
	this.loadNode();
	this.loadSubdomain();
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
				var rs = new Result();
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
			callback(e);
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
	var cname = ['SIMPLE', 'nodes'].join('_');
	var collection = this.db.collection(cname);
	findQuery = {owner: owner};
	collection.find(findQuery, {}).toArray(function (e, d) {
		if(e) { return false; }
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
	var cname = ['SIMPLE', 'nodes'].join('_');
	var collection = this.db.collection(cname);
	findQuery = {};
	collection.find(findQuery, {}).toArray(function (e, d) {
		self.nodes = d;
		d.map(function (v, k) {
			self.nodeIndex[ v.client ] = k;
		});
	});
};
Bot.prototype.loadSubdomain = function () {
	var self = this;
	var cname = ['SIMPLE', 'subdomain'].join('_');
	var collection = this.db.collection(cname);
	findQuery = {};
	collection.find(findQuery, {}).toArray(function (e, d) {
		self.subdomain = d;
		d.map(function (v, k) {
			self.subdomainIndex[ v.domain ] = k;
		});
	});
};
Bot.prototype.addNode = function(node) {
	var cname = ['SIMPLE', 'nodes'].join('_');
	var collection = this.db.collection(cname);
	var result = new Result();
	var format = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

	if(format.test(node.client)) {
		this.nodeIndex[node.client] = (this.nodes.push(node) - 1);
		result.setResult(1);
		result.setMessage('add node: ' + node.client);

		// write db
		node._id = new mongodb.ObjectID().toString();
		collection.insert(node, {}, function (e, d) {});
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

		var cname = ['SIMPLE', 'nodes'].join('_');
		var collection = this.db.collection(cname);
		collection.deleteOne({client: node}, function(e, d) {});
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
			var cname = ['SIMPLE', 'nodes'].join('_');
			var collection = this.db.collection(cname);
			findQuery = {_id: this.nodes[ this.nodeIndex[node.client] ]._id};
			collection.findAndModify(
				findQuery,
				{},
				{$set: node},
				{},
				function (e, d) {}
			);
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

Bot.prototype.domainRegister = function (options, cb) {
	var index;
	var now = new Date().getTime();
	options = dvalue.default(options, {
		UUID: undefined,
		domain: undefined,
		ip: undefined,
		port: undefined
	});
	index = this.subdomainIndex[options.domain] || -1;

	if(index > -1) {
		// domain exists - check key
		var record = this.subdomain[index];
		if(record.UUID != options.UUID && record.expire > now) {
			var e = new Error('Existing subdomain');
			e.code = 2;
			return cb(e);
		}
	}

	return this.assignDomain(options, cb);
};
Bot.prototype.assignDomain = function (options, cb) {
	var self = this;
	var node = {
		client: options.UUID,
		ip: options.ip,
		port: options.port
	};
	// testNode
	this.testNode(node, function (e, d) {
		if(e) {
			var msg = 'Unreachable ' + node.ip + ':' + node.port;
			e = new Error(msg);
			return cb(e);
		}
		else {
			self.updateDomain(options, cb);
		}
	});
};
Bot.prototype.updateDomain = function (options, cb) {
	var self = this;
	var cname = ['SIMPLE', 'subdomain'].join('_');
	var collection = this.db.collection(cname);
	var index = this.subdomainIndex[options.domain];
	var expire = new Date().getTime() + period;
	var record = {
		domain: options.domain,
		UUID: options.UUID,
		ip: options.ip,
		port: options.port,
		expire: expire,
		alive: new Date().getTime()
	};
	var findQuery = { domain: options.domain };

	// update memory data
	if(index > -1) { this.subdomain[index] = record; }
	else {
		this.subdomainIndex[options.domain] = (this.subdomain.push(record) - 1);
	}

	// update db data
	collection.findAndModify(
		findQuery,
		{},
		{$set: record},
		{upsert: true},
		function (e, d) { cb(e); }
	);
};
Bot.prototype.proxy = function (query, test, cb) {
	var self = this;
	var target, node;
	var now = new Date().getTime();
	var index = this.subdomainIndex[query.domain];
	if(!(index > -1)) {
		var err = new Error('subdomain not found');
		err.code = 1;
		cb(err);
		return;
	}

	node = this.subdomain[index];
	target = url.format({
		protocol: "http",
		hostname: node.ip,
		port: node.port
	});
	if(node.expire > now) {
		return cb(null, target);
	}
	else if (!test) {
		var err = new Error('machine offline');
		err.code = 3;
		return cb(err);
	}
	else {
		this.testNode(node, function (e) {
			if(e) {
				var err = new Error('machine offline');
				err.code = 3;
				return cb(err);
			}
			else {
				updateDomain(node, function () {});
				return cb(null, target);
			}
		});
	}
};

module.exports = Bot;
