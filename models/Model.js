var attributeRegExp = /^_[a-zA-Z0-9]+$/;

var Model = class {
	constructor(data) {
		return this;
	}
	formatDB() {
		var data = {};
		for(var k in this) {
			if(attributeRegExp.test(k)) {
				var key = k.substr(1);
				data[key] = this[k];
			}
		}
		return data;
	}
	formatAPI() {
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
		return result;
	}
	save() {
		var data = {};
		for(var k in this) {
			if(attributeRegExp.test(k)) {
				var key = k.substr(1);
				data[k] = this[k];
			}
		}
		this.__oldversion = data;
		return true;
	}
};

module.exports = Model;