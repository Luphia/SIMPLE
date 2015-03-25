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

	var data = this.parseJSON(msg.body);
	var label = msg.query.label;
	var table = this.parseTable(data, label);
	var rs = {
		"label": table.label,
		"path": "/dataset/" + table.name + "/"
	};

	datalist.push(rs);

	result.setResult(1);
	result.setData(datalist);

	return result.toJSON();
};

Bot.prototype.parseJSON = function(data) {

/*
type1
[
	{"key1": "value", "key2": "value", "key3": "value"},
	{"key1": "value", "key2": "value", "key3": "value"},
	{"key1": "value", "key2": "value", "key3": "value"}
]

type2
[
	[{"attr": "", "value": ""}, {"attr": "", "value": ""}, {"attr": "", "value": ""}],
	[{"attr": "", "value": ""}, {"attr": "", "value": ""}, {"attr": "", "value": ""}],
	[{"attr": "", "value": ""}, {"attr": "", "value": ""}, {"attr": "", "value": ""}]
]

type3
[
	["", "", "", ""],
	["", "", "", ""],
	["", "", "", ""]
]

type4
{
	"attr1": "",
	"attr2": "",
	"data" : [
	]
}
*/

	var type = this.typeOfJSON(data);
	var rows;
	if(type) {
		if(type == 1) {
			rows = data;
		}
		else {
			rows = this.findRows(data);
		}
	}
	else {
		rows = false;
	}

	rows = this.parseRows(rows);
	return rows;
};

Bot.prototype.isRows = function(objs) {
	if(!util.isArray(objs)) { return false; }

	var rows = this.randomPick(objs, 3);
	var raw1 = rows[0];

	for(var key in raw1) {
		for(var j = 1; j < rows.length; j++) {
			if(!rows[j].hasOwnProperty(key)) {
				return false;
			}
		}
	}

	return true;
};

Bot.prototype.randomPick = function(data, n) {
	var num = parseInt(n) || 1;
	var arr = this.clone(data);
	var result = [];

	while(num-- > 0) {
		result.push( arr.splice(parseInt(Math.random() * arr.length), 1)[0] );
	}

	if(result.length <= 1) {
		result = result[0];
	}

	return result;
};

Bot.prototype.typeOfJSON = function(data) {
	var type = typeof(data);
	if(util.isArray(data) && this.isRows(data)) {
		type = 1;
	}
	else if(type == 'object'){
		type = 2;
	}

	return type;
}

Bot.prototype.findRows = function(json) {
	for(var k in json) {
		if(this.isRows(json[k])) {
			return json[k];
		}
	}

	return false;
}

Bot.prototype.parseRows = function(arr) {
/*
type1:
	{"key1": "value", "key2": "value", "key3": "value"}
type2:
	[{"attr": "", "value": ""}, {"attr": "", "value": ""}, {"attr": "", "value": ""}]
type3:
	["", "", "", ""]
*/
	if(!arr) { return false; }

	var rows = [];
	if(!util.isArray(arr[0])) {
		rows = rows.concat(arr);
	}
	else {
		rows = arr;
	}

	return rows;
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