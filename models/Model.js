var Model = class {
	constructor(data) {
		return this;
	}
	formatDB() {
		var data = {};
		for(var k in this) {
			if(k.indexOf("_") == 0) {
				var key = k.substr(1);
				data[key] = this[k];
			}
		}
		return data;
	}
	formatAPI() {
		var data = {};
		for(var k in this) {
			if(k.indexOf("_") == 0) {
				var key = k.substr(1);
				data[key] = this[key];
			}
		}
		return data;
	}
}

module.exports = Model;