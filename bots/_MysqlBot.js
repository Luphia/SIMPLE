var SocketBot = require('./_SocketBot.js')
,	util = require('util')
,	mysql      = require('mysql');

var Bot = function(config) {
	if(!config) config = {};
	this.init(config);
};

util.inherits(Bot, SocketBot);

Bot.prototype.init = function(config) {
	Bot.super_.prototype.init.call(this, config);
	this.dburl = "";
	this.DB = mysql.createConnection(this.dburl);
	this.tags = ["mysql"];
};

Bot.prototype.start = function() {
	Bot.super_.prototype.start.apply(this);
	try {
		this.DB.connect();
	}
	catch(e) {}
};

Bot.prototype.stop = function() {
	Bot.super_.prototype.stop.apply(this);
	this.DB.end();
};

Bot.prototype.get = function(msg) {
	var rs;

	if(msg) {
		var sql, params;
		if(typeof msg != 'object') {
			sql = msg;
		}
		else {
			sql = msg.sql || false;
			params = msg.params || false;
		}

		rs = this.query(sql, params);
		this.response(rs, msg);
	}
	else {
		this.response({"error": "SQL undefined"}, msg);
	}
};

Bot.prototype.query = function(sql, params) {
	var rs;
	if(!sql) { rs = false; }
	else if(Array.isArray(sql)) {
		rs = this.transation(sql);
	}
	else if(typeof(sql) == "object") {
		rs = this.query(sql.sql, sql.params);
	}
	else {
		if(!params) { rs = this.normalQuery(sql); }
		else { rs = this.safeQurey(sql, params); }
	}
	console.log('')
	return rs;
};

Bot.prototype.normalQuery = function(sql, callback) {
	var rs;

	if(!sql) { return false; }
	this.DB.query(sql, function(err, rows, fields) {
		if(err) {
			console.log(err);
			rs = false;
		}
		else {
			rs = rows;
		}
	});

	while(rs === undefined) {
		require('deasync').runLoopOnce();
	}

	return rs;
};

Bot.prototype.safeQurey = function(sql, params, callback) {
	var rs;

	if(!sql || !params) { return false; }
	this.DB.query(sql, params, function(err, rows, fields) {
		if(err) {
			console.log(err);
			rs = false;
		}
		else {
			rs = rows;
		}
	});

	while(rs === undefined) {
		require('deasync').runLoopOnce();
	}

	return rs;
};

Bot.prototype.transation = function(sql) {
	if(Array.isArray(sql)) { sql = [sql]; }
	this.DB.beginTransaction(function(err) {
		for(var k in sql) {
			var s = sql[k].sql || s;
			var p = sql[k].params;

			if(!s) { continue; }
			else if(!p) {

			}
			else {

			}
		}
	});
};

module.exports = Bot;