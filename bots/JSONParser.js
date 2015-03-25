/*
var ExcelParser = require('./bots/ExcelParser.js');
var ecFile = require('ecfile');
var fs = require('fs');

var excel = fs.readFileSync('xls1.xlsx');
var ecfile = new ecFile(excel);
var parser = new ExcelParser();
parser.exec(ecfile.toJSON());

*/

var ParentBot = require('./_SocketBot.js')
,	fs = require('fs')
,	util = require('util')
,	Result = require('../classes/Result.js');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
	this.path = [
		{"method": "post", "path": "/jsonparser/"}
	];
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);

};

Bot.prototype.exec = function (msg) {
	var result = new Result();
	var datalist = [];

	for(var key in msg.files) {
		var file = fs.readFileSync(msg.files[key]["path"]);
		var ecfile = new ecFile(file);
		var data = this.parseJSON(msg.body);
		var label = msg.query.label;

		for(var k in data) {
			var table = this.parseTable(data[k].data, label);
			var rs = {
				"label": table.label,
				"path": "/dataset/" + table.name + "/"
			};

			datalist.push(table);
		}

	}

	result.setResult(1);
	result.setData(datalist);

	return result.toJSON();
};

Bot.prototype.parseJSON = function(json) {

};

Bot.prototype.parseTable = function(dataset, label) {
	var msg = {
		"method": "post",
		"body": dataset,
		"query": {}
	}

	if(typeof(label) == 'string') { msg.query.label = label; }

	var rs = this.ask(msg, "Dataset");

	return rs.data;
};



module.exports = Bot;