const path = require('path');

const mongodb = require('mongodb');

const dvalue = require('dvalue');
const textype = require('textype');
const Parent = require(path.join(__dirname, 'Model'));

var Model = class extends Parent {
	constructor(data) {
		super(data);
		switch(typeof(data)) {
			case 'string':

			break;

			default:

		}
	}
};
Model.check = token => {	
	var tbody = token.substr(0, 24);
	var tcrc = token.substr(24);
};
Model.TABLENAME = "Tokens";

module.exports = Model;