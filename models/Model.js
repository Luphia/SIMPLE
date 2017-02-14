const assert = require('assert');
const dvalue = require('dvalue');

var attributeRegExp = /^_[a-zA-Z0-9]+$/;

var Model = class {
	constructor(data) {
		return this;
	}
	toDB() {
		var data = {};
		for(var k in this) {
			if(attributeRegExp.test(k)) {
				var key = k.substr(1);
				data[key] = this[k];
			}
		}
		return data;
	}
	toAPI() {
		var data = {};
		for(var k in this) {
			if(attributeRegExp.test(k)) {
				var key = k.substr(1);
				data[key] = this[key];
			}
		}
		return data;
	}
	get updateQuery() {
		var result = {};
		for(var k in this) {
			if(attributeRegExp.test(k)) {
				var key = k.substr(1);
				try {
					assert.deepEqual(this[k], this.__oldversion[k]);
					// equal
				}
				catch(e) {
					// not equal
					result[key] = this[k];
				}
			}
		}
		return {"$set": result};
	}
	save() {
		var data = {};
		for(var k in this) {
			if(attributeRegExp.test(k)) {
				var key = k.substr(1);
				data[k] = this[k];
			}
		}
		this.__oldversion = dvalue.clone(data);
		return true;
	}
};

module.exports = Model;