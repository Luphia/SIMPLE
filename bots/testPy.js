var ParentBot = require('./_SocketBot.js')
,	util = require('util')
,	Result = require('../Classes/Result.js')
,	request = require('request');

var Bot = function(config) {
	if(!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function(config) {
	Bot.super_.prototype.init.call(this, config);
	this.path = [{method: "get", path: "/py/"}];
};

Bot.prototype.start = function() {
	Bot.super_.prototype.start.apply(this);

	var rs = this.cmd('python ./resources/hello.py');
	console.log(rs);
};

Bot.prototype.stop = function() {
	Bot.super_.prototype.stop.apply(this);
};

Bot.prototype.exec = function(msg) {
	var rs = new Result();
	var data = this.cmd('python ./resources/hello.py');

	rs.setResult(1);
	rs.setMessage('execute hello.py');
	rs.setData(data);

	return rs;
};

module.exports = Bot;