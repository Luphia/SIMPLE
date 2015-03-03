/*

var ECDB = require('ecdb');
var ecdb = new ECDB();
ecdb.connect({"url": "mongodb://10.10.23.31:27010/easyDB"});
ecdb.listData("topic");

 */

var SocketBot = require('./_SocketBot.js')
,	util = require('util')
,	ECDB = require('ecdb');

var RecorderBot = function(config) {
	if(!config) config = {};
	this.init(config);
};

util.inherits(RecorderBot, SocketBot);

RecorderBot.prototype.init = function(config) {
	RecorderBot.super_.prototype.init.call(this, config);
	this.DB = new ECDB();
	this.dburl = config.dburl || 'mongodb://10.10.23.31:27010/easyDB';
	this.tags = ["recorder"];
};

RecorderBot.prototype.start = function() {
	RecorderBot.super_.prototype.start.apply(this);
	this.DB.connect({"url": this.dburl});
};

RecorderBot.prototype.stop = function() {
	RecorderBot.super_.prototype.stop.apply(this);
	this.DB.disconnect();
};

RecorderBot.prototype.get = function(msg) {
	var rs;

	if(msg) {
		if(typeof msg != 'object') {
			msg = {"data": msg};
		}
		rs = this.save(msg);
		this.response(rs, msg);
	}
};

RecorderBot.prototype.save = function(msg) {
	var table = msg.table || 'record'
	,	data = msg.data || msg
	,	from = msg._from
	,	msgID = msg._id;

	return this.DB.postData(table, data);
};

module.exports = RecorderBot;