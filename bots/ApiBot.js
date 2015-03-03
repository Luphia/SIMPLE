var SocketBot = require('./_SocketBot.js')
,	util = require('util')
,	request = require('request');

var ApiBot = function(config) {
	if(!config) config = {};
	this.init(config);
};

util.inherits(ApiBot, SocketBot);

ApiBot.prototype.init = function(config) {
	ApiBot.super_.prototype.init.call(this, config);
	this.tags = ["api"];
};

ApiBot.prototype.start = function() {
	ApiBot.super_.prototype.start.apply(this);
};

ApiBot.prototype.stop = function() {
	ApiBot.super_.prototype.stop.apply(this);
};

ApiBot.prototype.get = function(msg) {
	var rs;
	rs = this.rest(msg);
	this.response(rs, msg);
};

ApiBot.prototype.rest = function(msg) {
	var rs
	,	method = "get"
	,	options = {
			"url": msg.query.source
		}
	;

	var t1, t2, t3, t4;
	t1 = new Date();

	request[method](options, function(err, response, body) {
		var data;
		t2 = new Date();
		try {
			var tmpData = JSON.parse(body);

			data = tmpData
			t3 = new Date();
			rs = data;
		}
		catch(e) {
			console.log(e);
			data = [];
			rs = data;
		}
	});

	while(rs === undefined) {
		require('deasync').runLoopOnce();
	}
	return rs;
};

module.exports = ApiBot;