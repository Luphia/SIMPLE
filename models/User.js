const path = require('path');

const mongodb = require('mongodb');

const dvalue = require('dvalue');
const textype = require('textype');
const Parent = require(path.join(__dirname, 'Model'));

var Model = class extends Parent {
	constructor(data) {
		data = data || {};
		super(data);
		this.profile = data;
		super.save();
	}

	set profile(value) {
		value = value || {};
		this.uid = value.uid || value._id;
		this.account = value.account || value.email;
		this.password = value.password;
		this.username = value.username;
		this.displayname = value.displayname;
		this.gender = value.gender;
		this.photo = value.photo;
		this.email = value.email;
		this.phone = value.phone;
		this.facebook = value.facebook;
		this.googleplus = value.googleplus;
		this.twitter = value.twitter;
		this.linkedin = value.linkedin;
		this.status = value.status;
		this.ctime = value.ctime;
		this.ltime = value.ltime;
		return this;
	}
	get profile() {
		return super.toAPI();
	}

	set uid(value) {
		switch(typeof(value)) {
			case 'string':
				if(value.length > 0) {
					this._uid = value;
				}
			break;

			case 'object':
				var _id = value.str || value.toString();
				this._uid = _id;
			break;
		}
		return this.uid;
	}
	get uid() {
		return this._uid;
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

	set phone(value) {
		var phoneObject = {country: undefined, number: undefined, verify: false};
		switch(typeof(value)) {
			case 'string':
				phoneObject.number = value
			break;

			case 'object':
				phoneObject.country = value.country;
				phoneObject.number = value.number;
				phoneObject.verify = !!value.verify;
			break;
		}
		this._phone = phoneObject;
		return this.phone;
	}
	get phone() {
		var result = "";
		if(this._phone) {
			if(this._phone.country) { result = result.concat(this._phone.country); }
			if(this._phone.number) { result = result.concat(this._phone.number); }
		}
		else {
			result = undefined;
		}
		return result;
	}

	set facebook(value) {
		value = value || {};
		if(typeof(value.id) == 'string' && value.id.length > 0) {
			this._facebook = {
				id: value.id,
				name: value.name || "",
				picture: textype.isURL(value.picture)? value.picture: "",
				email: textype.isEmail(value.email)? value.email: ""
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
				picture: textype.isURL(value.picture)? value.picture: "",
				email: textype.isEmail(value.email)? value.email: ""
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
				picture: textype.isURL(value.picture)? value.picture: "",
				email: textype.isEmail(value.email)? value.email: ""
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
				picture: textype.isURL(value.picture)? value.picture: "",
				email: textype.isEmail(value.email)? value.email: ""
			};
		}
		return this.linkedin;
	}
	get linkedin() {
		return this._linkedin;
	}

	set status(value) {
		this._status = Model.STATUS.ENABLE;
		for(var k in Model.STATUS) {
			if(Model.STATUS[k] == value) {
				this._status = Model.STATUS[k];
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

	get condition() {
		var result = {};
		// uid, email, googleplus.id, facebook.id, twitter.id, linkedin.id
		var uid, account, email, googleplus, facebook, twitter, linkedin;
		if(uid = this.uid) {
			result._id = textype.isObjectID(uid)? new mongodb.ObjectID(uid): uid;
		}
		else if(account = this.account) {
			result.account = account;
		}
		else if(email = this.email) {
			result["email.address"] = email;
		}
		else if(facebook = this.facebook) {
			result["facebook.id"] = facebook.id;
		}
		else if(googleplus = this.googleplus) {
			result["googleplus.id"] = googleplus.id;
		}
		else if(twitter = this.twitter) {
			result["twitter.id"] = twitter.id;
		}
		else if(linkedin = this.linkedin) {
			result["linkedin.id"] = linkedin.id;
		}
		return result;
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

	toDB() {
		var result = super.toDB();
		delete result.uid;
		return result;
	}
	toAPI() {
		return super.toAPI();
	}
};

Model.STATUS = {
	DISABLE: 0,
	ENABLE: 1,
	UNVERIFIED: -1,
	BAN: -2
};

Model.TABLENAME = "Users";

module.exports = Model;
