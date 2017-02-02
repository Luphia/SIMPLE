const path = require('path');

const mongodb = require('mongodb');

const dvalue = require('dvalue');
const textype = require('textype');
const Parent = require(path.join(__dirname, 'Model'));
const TIME = require(path.join(__dirname, 'TIME'))

var Model = class extends Parent {
	// require: uid.string | object
	constructor(data) {
		super(data);
		switch(typeof(data)) {
			case 'string':
				data = {uid: data};
			break;

			default:
				data = data || {};
				data.uid = data.uid || '';
		}
		this.data = data;
		super.save();
	}

	set data(value) {
		this.uid = value.uid;
		this.token = value.token;
		this.password = value.password;
		this.ctime = value.ctime;
		this.lifetime = value.lifetime;
		this.destroytime = value.destroytime;
		this.expire = value.expire;
		this.destroy = value.destroy;
		return this;
	}

	set uid(value) {
		this._uid = value;
		return this.uid;
	}
	get uid() {
		return this._uid
	}

	set token(value) {
		if(!Model.check(value)) {
			value = Model.generate();
		}
		this._token = value;
		return this.token;
	}
	get token() {
		return this._token;
	}

	set password(value) {
		if(typeof(value) == 'string') {
			this._password = value;
		}
		return this.password;
	}
	get password() {
		return this._password;
	}

	set ctime(value) {
		value = Number.isInteger(value)? value: new Date().getTime();
		this._ctime = value;
		return this.ctime;
	}
	get ctime() {
		return this._ctime;
	}

	set lifetime(value) {
		value = Number.isInteger(value)? value: Model.DEFAULTLIFETIME;
		this._lifetime = value;
		return this.lifetime;
	}
	get lifetime() {
		return Number.isInteger(this._lifetime)? this._lifetime: Model.DEFAULTLIFETIME;
	}

	set destroytime(value) {
		value = Number.isInteger(value)? value: Model.DEFAULTDESTROYTIME;
		this._destroytime = value;
		return this.destroytime;
	}
	get destroytime() {
		return Number.isInteger(this._destroytime)? this._destroytime: Model.DEFAULTDESTROYTIME;
	}

	set expire(value) {
		if(!Number.isInteger(value)) {
			let tempCtime = Number.isInteger(this.ctime)? this.ctime: new Date().getTime();
			value = tempCtime + this.lifetime;
		}
		this._expire = value;
		return this.expire;
	}
	get expire() {
		return Number.isInteger(this._expire)? this._expire: TIME.NEVER;
	}

	set destroy(value) {
		if(!Number.isInteger(value)) {
			let tempCtime = Number.isInteger(this.ctime)? this.ctime: new Date().getTime();
			value = tempCtime + this.destroytime;
		}
		this._destroy = value;
		return this.destroy;
	}
	get destroy() {
		return Number.isInteger(this._destroy)? this._destroy: TIME.NEVER;
	}

	get condition() {
		var result = {
			token: this._token,
			destroy: {$gt: new Date().getTime()}
		};
		if(this._password) { result.password = this._password; }
		return result;
	}

	renew() {
		let now = new Date().getTime();
		this.destroy = now;
		var newToken = new Model({
			uid: this.uid,
			ctime: now,
			lifetime: this.lifetime,
			destroytime: this.destroytime
		});
		return newToken;
	}

	toDB() {
		if(typeof(this._password) != 'string') {
			this.password = dvalue.randomID();
		}
		var result = super.toDB();
		return result;
	}
	toAPI() {
		if(typeof(this._password) != 'string') {
			this.password = dvalue.randomID();
		}
		var result = super.toAPI();
		return result;
	}
};
Model.check = (token) => {
	if(!token) { return false; }
	else if(typeof(token) == 'object') {
		token = token.token;
	}
	var tbody = token.substr(0, 24);
	var tcrc = token.substr(24);
	return dvalue.CRC32(tbody) == tcrc;
};
Model.generate = () => {
	var tbody = dvalue.randomID(24);
	var tcrc = dvalue.CRC32(tbody);
	var token = tbody + tcrc;
	return token;
};
Model.TABLENAME = "Tokens";
Model.DEFAULTLIFETIME = 86400000;
Model.DEFAULTDESTROYTIME = 2592000000;

module.exports = Model;