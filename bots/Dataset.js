/*
# Dataset
{
	"column": ["c1", "c2", "c3"],
	"value": [
		["a11", "a21", "a31"],
		["a12", "a22", "a32"],
		["a13", "a23", "a32"]
	]
}

## NEW Dataset
### JSON
### XLSX
### CSV

## Merge
### Dataset
#### Inner
#### Left
#### Right
#### Full

### API
#### {params}
#### {$params}
*/


var ParentBot = require('./_SocketBot.js')
,	util = require('util')
,	ecDB = require('ecdb')
,	ecFile = require('ecfile');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
	this.path = [
		{"method": "get", "path": "/dataset/:table"},
		{"method": "get", "path": "/dataset/"}
	];

	this.db = new ecDB();
	this.db.connect();
};

Bot.prototype.exec = function (msg) {
	var rs = {};
	var url = msg.url;
	var pass, uri, table, sql, query;

	if(url) {
		pass = (msg.method == 'GET' && (url.lastIndexOf('/') == url.length - 1) ? 'LIST' : msg.method) + url.split('/').length.toString();
		uri = url.split('/');
		table = msg.params.table;
		sql = msg.query.sql;
		query = msg.query.q;
	}
	else {
		pass = 'newDataset';
	}

	switch (pass) {
		case 'newDataset':
			rs = this.newDataset(msg.body);
			break;

		case 'FIND':
			//this.findData(req, res, next);
			break;
		case 'LIST3':
			if (sql) {
				//this.sql(req, res, next);
			}
			else {
				rs = this.listTable();
			}
			break;
		case 'GET3':
			//this.getSchema(req, res, next);
			break;
		case 'POST3':
			//this.postTable(req, res, next);
			break;
		case 'PUT3':
			//this.putTable(req, res, next);
			break;
		case 'DELETE3':
			//this.delTable(req, res, next);
			break;
		case 'LIST4':
			rs = this.listData(table);
			break;
		case 'GET4':
			//this.getData(req, res, next);
			break;
		case 'POST4':
			//this.postData(req, res, next);
			break;
		case 'PUT4':
			if (query) {
				//this.update(req, res, next);
			}
			else {
				//this.putData(req, res, next);
			}
			break;
		case 'DELETE4':
			//this.delData(req, res, next);
			break;

		default:
			//res.result.response(next, 1, pass, { url: req.originalUrl, method: req.method });
			break;
	}


	return rs;
};

Bot.prototype.isRows = function(objs) {
	if(!Array.isArray(objs)) { return false; }

	var raw1 = objs[0];

	for(var key in raw1) {
		for(var j = 1; j < objs.length; j++) {
			if(!objs[j].hasOwnProperty(key)) {
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
	if(Array.isArray(data)) {
		var checkdata = this.randomPick(data, 3);

	}
	else if(type == 'object'){

	}

	return type;
}

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
[
	[
		["", "", "", ""]
		["", "", "", ""]
	],
	[
		["", "", "", ""]
		["", "", "", ""]
	],
	[
		["", "", "", ""]
		["", "", "", ""]
	]
]

type5
{
	"attr1": "",
	"attr2": "",
	"data" : [
	]
}

*/


};

Bot.prototype.parseCSV = function() {

};

Bot.prototype.parseAPI = function() {

};

Bot.prototype.newDataset = function(dataset) {
	var tablename = this.randomID(16);
	var rs = {"tablename": tablename};
	for(var i = 1; i < dataset.length; i++) {
		var row = this.parseRow(dataset[0], dataset[i]);
		this.db.postData(tablename, row);
	}

	return rs;
};

Bot.prototype.parseRow = function(column, rowdata) {
/*
type1:
	{"key1": "value", "key2": "value", "key3": "value"}
type2:
	[{"attr": "", "value": ""}, {"attr": "", "value": ""}, {"attr": "", "value": ""}]
type3:
	["", "", "", ""]
*/

	var row = {};
	for(var k in column) {
		row[column[k]] = rowdata[k];
	}

	return row;
};

Bot.prototype.mergeData = function() {

};

Bot.prototype.innerJoin = function() {
	
};

Bot.prototype.leftJoin = function() {

};

Bot.prototype.rightJoin = function() {

};

Bot.prototype.fullJoin = function() {

};

Bot.prototype.listTable = function() {
	var rs = this.db.listTable();
	return rs;
};

Bot.prototype.listData = function(table) {
	var rs = this.db.listData(table);
	return rs;
};

module.exports = Bot;