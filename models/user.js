const path = require('path');
const dvalue = require('dvalue');
const textype = require('textype');
const Parent = require(path.join(__dirname, 'Model'));

var user = class extends Parent {
	constructor(data) {
		var data = data || {};
		super(data);
		this.uid = data.uid;
		this.account = data.account;
		this.password = data.password;
		this.username = data.username;
		this.displayname = data.displayname;
		this.gender = data.gender;
		this.photo = data.photo;
		this.email = data.email;
		this.facebook = data.facebook;
		this.googleplus = data.googleplus;
		this.twitter = data.twitter;
		this.linkedin = data.linkedin;
		this.status = data.status;
		this.ctime = data.ctime;
		this.ltime = data.ltime;
	}

	set account(value) {
		value = (typeof(value) == 'string' && value.length > 0)? value: "";
		this._account = value;
		return this.account;
	}
	get account() {
		return this._account;
	}

	set password(value) {
		var passwordObject = {hash: "", salt: "", mtime: new Date().getTime(), expire: -1};
		switch(typeof(value)) {
			case 'string':
				passwordObject = dvalue.default(dvalue.hashPassword(value), passwordObject);
			break;

			case 'object':
				if(typeof(value.hash) == 'string' && value.hash.length == 40 && typeof(value.salt) == 'string' && value.salt.length == 8) {
					passwordObject.hash = value.hash;
					passwordObject.salt = value.salt;
				}
				else {
					passwordObject = dvalue.hashPassword(value.password);
				}
				passwordObject.mtime = Number.isInteger(value.mtime)? value.mtime: passwordObject.mtime;
				passwordObject.expire = Number.isInteger(value.expire)? value.expire: passwordObject.expire;
			break;

			default:
				value = "";
				passwordObject = dvalue.default(dvalue.hashPassword(value), passwordObject);
		}
		this._password = passwordObject;
		return this.password;
	}
	get password() {
		return this._password.hash;
	}

	set username(value) {
		var nameObject = {given: "", middle: "", family: ""};
		switch(typeof(value)) {
			case 'string':
				var nameArray = value.split(" ");
				if(nameArray.length == 2) {
					nameObject.given = nameArray[0];
					nameObject.family = nameArray[1];
				}
				else if(nameArray.lentth == 3) {
					nameObject.given = nameArray[0];
					nameObject.middle = nameArray[1];
					nameObject.family = nameArray[2];
				}
				else {
					nameObject.given = value;
				}
			break;

			case 'object':
				nameObject.given = value.given || nameObject.given;
				nameObject.middle = value.middle || nameObject.middle;
				nameObject.family = value.family || nameObject.family;
			break;
		}
		this._username = nameObject;
		return this.username;
	}
	get username() {
		return this._username;
	}

	set displayname(value) {
		value = (typeof(value) == 'string' && value.length > 0)? value: "";
		this._displayname = value;
		return this.displayname;
	}
	get displayname() {
		return this._displayname;
	}

	set gender(value) {
		value = (typeof(value) == 'string' && value.length > 0)? value: "";
		switch(value.toLowerCase()) {
			case '0':
			case 'f':
			case 'female':
				value = 'female';
			break;

			case '1':
			case 'm':
			case 'male':
				value = 'male';
			break;

			default:
				value = undefined;
		}
		this._gender = value;
		return this.gender;
	}
	get gender() {
		return this._gender;
	}

	set photo(value) {
		value = textype.isURL(value)? value: undefined;
		this._photo = value;
		return this.photo;
	}
	get photo() {
		return this._photo;
	}

	set email(value) {
		var emailObject = {address: undefined, verify: false};
		switch(typeof(value)) {
			case 'string':
				emailObject.address = textype.isEmail(value)? value: undefined;
			break;

			case 'object':
				emailObject.address = textype.isEmail(value.address)? value.address: undefined;
			break;
		}
		this._email = emailObject;
		return this.email;
	}
	get email() {
		return this._email.address;
	}

	set facebook(value) {
		value = value || {};
		if(typeof(value.id) == 'string' && value.id.length > 0) {
			this._facebook = {
				id: value.id,
				name: value.name || "",
				picture: dvalue.isURL(value.picture)? value.picture: "",
				email: dvalue.isEmail(value.email)? value.email: ""
			};
		}
		return this.facebook;
	}
	get facebook() {
		return this._facebook;
	}

	set googleplus(value) {
		value = value || {};
		if(typeof(value.id) == 'string' && value.id.length > 0) {
			this._googleplus = {
				id: value.id,
				name: value.name || "",
				picture: dvalue.isURL(value.picture)? value.picture: "",
				email: dvalue.isEmail(value.email)? value.email: ""
			};
		}
		return this.googleplus;
	}
	get googleplus() {
		return this._googleplus;
	}

	set twitter(value) {
		value = value || {};
		if(typeof(value.id) == 'string' && value.id.length > 0) {
			this._twitter = {
				id: value.id,
				name: value.name || "",
				picture: dvalue.isURL(value.picture)? value.picture: "",
				email: dvalue.isEmail(value.email)? value.email: ""
			};
		}
		return this.twitter;
	}
	get twitter() {
		return this._twitter;
	}

	set linkedin(value) {
		value = value || {};
		if(typeof(value.id) == 'string' && value.id.length > 0) {
			this._linkedin = {
				id: value.id,
				name: value.name || "",
				picture: dvalue.isURL(value.picture)? value.picture: "",
				email: dvalue.isEmail(value.email)? value.email: ""
			};
		}
		return this.linkedin;
	}
	get linkedin() {
		return this._linkedin;
	}

	set status(value) {
		this._status = user.STATUS.ENABLE;
		for(var k in user.STATUS) {
			if(user.STATUS[k] == value) {
				this._status = user.STATUS[k];
				break;
			}
		}
	}
	get status() {
		return this._status;
	}

	set ctime(value) {
		value = new Date(value).getTime();
		if(!value > 0) { value = new Date().getTime(); }
		this._ctime = value;
		return this.ctime;
	}
	get ctime() {
		return this._ctime;
	}

	set ltime(value) {
		value = new Date(value).getTime();
		if(!Number.isInteger(value)) { value = -1; }
		this._ltime = value;
		return this.ltime;
	}
	get ltime() {
		return this._ltime;
	}

	checkPassword(password) {
		var testObject = {
			hash: this._password.hash,
			salt: this._password.salt,
			password: password
		};
		return dvalue.checkPassword(testObject);
	}
	checkPasswordExpire() {
		return this.password.expire > new Date().getTime();
	}

	import(data) {

	}
	formatDB() {
		return super.formatDB();
	}
	formatAPI() {
		return super.formatAPI();
	}
}

user.STATUS = {
	DISABLE: 0,
	ENABLE: 1,
	UNVERIFIED: -1,
	BAN: -2
};

module.exports = user;