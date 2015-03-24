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
,	xlsx = require('node-xlsx')
,	ecFile = require('ecfile');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
	this.path = [
		{"method": "post", "path": "/excelparser/"}
	];
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);

};

Bot.prototype.exec = function (msg) {
	if(msg.blob) { msg = {"body": msg}; }

	var rs;
	//var ecfile = new ecFile(msg.body);
	//rs = xlsx.parse(ecfile.toBlob());

	rs = {
		"result": 1,
		"message": "",
		"data": []
	}

	for(var key in msg.files) {
		var file = fs.readFileSync(msg.files[key]["path"]);
		var ecfile = new ecFile(file);
		var data = xlsx.parse(ecfile.toBlob());

		for(var k in data) {
			var tablename = this.parseTable(data[k].data);
			var table = {
				"label": data[k].name,
				"path": "/dataset/" + tablename
			};

			rs.data.push(table);
		}

	}

	return rs;
};

Bot.prototype.parseTable = function(dataset) {
	var msg = {
		"method": "post",
		"body": dataset
	}
	var rs = this.ask(msg, "Dataset")

	return rs.tablename;
};



module.exports = Bot;