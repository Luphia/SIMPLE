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
,	ecFile = require('ecfile')
,	Result = require('../classes/Result.js');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
	this.path = [
		{"method": "get", "path": "/dataset/"},
		{"method": "all", "path": "/dataset/:table"},
		{"method": "all", "path": "/dataset/:table/:id"}
	];

	this.db = new ecDB();
	this.db.connect();
};

Bot.prototype.exec = function (msg) {
	var rs = new Result();
	var url = msg.url;
	var body = msg.body;
	var pass, uri, table, sql, query, id, rsdata, info;

	if(url) {
		pass = (msg.method == 'GET' && (url.lastIndexOf('/') == url.length - 1) ? 'LIST' : msg.method) + url.split('/').length.toString();
		uri = url.split('/');
		table = msg.params.table;
		id = msg.params.id;
		sql = msg.query.sql;
		query = msg.query.q;
	}
	else {
		pass = 'newDataset';
	}

	switch (pass) {
		case 'newDataset':
			rsdata = this.newDataset(msg.body);
			break;

		case 'FIND':
			rsdata = this.db.find(table, query);
			break;
		case 'LIST3':
			if (sql) {
				rsdata = this.db.sql(req, res, next);
			}
			else {
				rsdata = this.db.listTable();
			}
			break;
		case 'GET3':
			rsdata = this.db.getTable(table);
			break;
		case 'POST3':
			var schema = body;
			rsdata = this.db.postTable(table, schema);
			break;
		case 'PUT3':
			var schema = body;
			rsdata = this.db.putTable(table, schema);
			break;
		case 'DELETE3':
			rsdata = this.db.deleteTable(table);
			break;
		case 'LIST4':
			rsdata = this.db.pageData(table, query);
			break;
		case 'GET4':
			rsdata = this.db.getData(table, id);
			break;
		case 'POST4':
			var data = body;
			rsdata = this.db.postData(table, body);
			break;
		case 'PUT4':
			var data = body;
			if (query) {
				rsdata = this.db.updateData(table, id, data);
			}
			else {
				rsdata = this.db.putData(table, id, data);
			}
			break;
		case 'DELETE4':
			rsdata = this.db.deleteData(table, id);
			break;

		default:
			rsdata = msg;
			break;
	}

	if(rsdata) {
		rs.setResult(1);
		rs.setData(rsdata);
	}

	return rs.toJSON();
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

module.exports = Bot;