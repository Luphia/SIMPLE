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
	var pass, uri, table, sql, query, id, rsdata, info, message;

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
			var label = msg.query.label;
			var response = msg.query.response
			rsdata = this.newDataset(msg.body, label, response);
			message = "Set new "+msg.body+" Dataset Successful";
			break;

		case 'FIND':
			rsdata = this.db.find(table, query);
			message = "Find Table Data Successful";
			break;
		case 'LIST3':
			if (sql) {
				rsdata = this.db.sql(sql);
				message = "SQL Execute Successful";
			}
			else {
				rsdata = this.db.listTable();
				message = "List All Table Successful";
			}
			break;
		case 'GET3':
			rsdata = this.db.getTable(table);
			message = "Get Table Schema Successful";
			break;
		case 'POST3':
			var schema = body;
			rsdata = this.db.postTable(table, schema);
			message = "Create Table Successful";
			break;
		case 'PUT3':
			var schema = body;
			rsdata = this.db.putTable(table, schema);
			message = "Modify Table Successful";
			break;
		case 'DELETE3':
			rsdata = this.db.deleteTable(table);
			message = "Delete Table Successful";
			break;
		case 'LIST4':
			rsdata = this.db.pageData(table, query);
			message = "List Data to "+table+" Table Successful";
			break;
		case 'GET4':
			if(id.toLowerCase() == 'clean') {
				rsdata = this.db.cleanTable(table);
				message = "Table Clean: " + table;
			}
			else {
				rsdata = this.db.getData(table, id);
				message = "Get Data from "+table+" Table Successful";
			}
			break;
		case 'POST4':
			var data = body;
			rsdata = this.db.postData(table, body);
			message = "Insert Data to "+table+" Table Successful";
			break;
		case 'PUT4':
			var data = body;
			if (query) {
				rsdata = this.db.updateData(table, id, data);
				message = "Update Data to "+table+" Table Successful";
			}
			else {
				rsdata = this.db.putData(table, id, data);
				message = "Update or Insert Data to "+table+" Table Successful";
			}
			break;
		case 'DELETE4':
			rsdata = this.db.deleteData(table, id);
			message = "Delete Data to "+table+" Table Successful";
			break;

		default:
			rsdata = msg;
			message = "Debug Message";
			break;
	}

	if(rsdata) {
		rs.setResult(1);
		rs.setMessage(message);
		rs.setData(rsdata);
	}

	return rs;
};

Bot.prototype.newDataset = function(dataset, label, response) {
	var table = this.randomID(16);
	var rs = {"name": table, "label": label};
	var rows = [];

	for(var i = 1; i < dataset.length; i++) {
		var row = this.parseRow(dataset[0], dataset[i]);
		rows.push(row);
	}
	this.db.postData(rs, rows);
	if(response) {
		rs.data = rows;
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

	if(util.isArray(rowdata)) {
		for(var k in column) {
			row[column[k]] = rowdata[k];
		}
	}
	else if(typeof(rowdata) == 'object') {
		row = rowdata;
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