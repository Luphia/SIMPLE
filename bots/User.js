const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const q = require('q');
const url = require('url');
const path = require('path');
const crypto = require('crypto');
const raid2x = require('raid2x');
const dvalue = require('dvalue');
const textype = require('textype');

var tokenLife = 86400000;
var renewLife = 8640000000;
var maxUser = 10;
var ResetLife = 86400000;
var historyPeriod = 1800000;

var logger;

var CRCTable = (function() {
	var c = 0, table = new Array(256);

	for(var n = 0; n != 256; ++n) {
		c = n;
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		c = ((c&1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1));
		table[n] = c;
	}

	return typeof Int32Array !== 'undefined' ? new Int32Array(table) : table;
})();
var CRC32 = function(buffer) {
	var b, crc, i, len, code;
	if(!Buffer.isBuffer(buffer)) { buffer = new Buffer(new String(buffer)); }
	if(buffer.length > 10000) return CRC32_8(buffer);

	for(var crc = -1, i = 0, len = buffer.length - 3; i < len;) {
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
		crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++])&0xFF];
	}
	while(i < len + 3) { crc = (crc >>> 8) ^ CRCTable[(crc ^ buffer[i++]) & 0xFF]; }
	code = (crc > 0? crc: crc * -1).toString(16);
	while(code.length < 8) { code = '0' + code; }
	return code;
};

var formatUser = function (user) {
	user = dvalue.default(user, {
		account: "",
		password: "",
		username: "",
		role: 1,
		email: "",
		photo: "",
		ctime: new Date().getTime(),
		ltime: 0,
		enable: true,
		verified: false,
		allowmail: false,
		status: 1
	});
	return user;
};
var descUser = function (user) {
	user.uid = user._id.toString();
	user = dvalue.default(user, {
		uid: "",
		account: "",
		username: "",
		role: 1,
		email: "",
		emails: [],
		photo: "",
		photos: [],
		ctime: new Date().getTime(),
		ltime: 0,
		enable: false,
		verified: false,
		allowmail: false,
		status: 1
	});
	if(user.username.length == 0) { user.username = user.email; }
	if(user.email.length == 0 && user.emails.length > 0) { user.email = user.emails[0]; }
	if(user.photo.length == 0 && user.photos.length > 0) { user.photo = user.photos[0]; }
	user.password = user.password.length > 0;
	delete user._id;
	delete user.emails;
	delete user.photos;
	delete user.validcode;
	delete user.reset;
	delete user.facebook;
	return user;
};
var mergeCondition = function (user) {
	var condition;
	var profile = user.profile;
	switch(user.type) {
		case 'email':
			condition = {
				emails: {$in: [profile.email]},
				account: '',
				enable: true
			};
			break;
		default:
			condition = {
				email: {$in: profile.emails},
				facebook: {$exists: false}
			};
	}
	return condition;
};

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
	logger = config.logger;
	this.mailHistory = {};
	this.loginHistory = {};
	this.verifyHistory = {};
	this.resetHistory = {};
};

Bot.prototype.start = function (cb) {
	var self = this;
	Bot.super_.prototype.start.call(this);
};

Bot.prototype.addVerifyHistory = function (uid) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.verifyHistory[uid] = dvalue.default(this.verifyHistory[uid], []);
	var t = this.verifyHistory[uid].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.verifyHistory[uid].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.verifyHistory[uid].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.verifyHistory[uid].push(now); }
	return rs;
};
Bot.prototype.cleanVerifyHistory = function (uid) {
	return this.verifyHistory[uid] = [];
};
Bot.prototype.addResetHistory = function (uid) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.resetHistory[uid] = dvalue.default(this.resetHistory[uid], []);
	var t = this.resetHistory[uid].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.resetHistory[uid].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.resetHistory[uid].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.resetHistory[uid].push(now); }
	return rs;
};
Bot.prototype.cleanResetHistory = function (uid) {
	return this.resetHistory[uid] = [];
};
Bot.prototype.addLoginHistory = function (uid) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.loginHistory[uid] = dvalue.default(this.loginHistory[uid], []);
	var t = this.loginHistory[uid].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.loginHistory[uid].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.loginHistory[uid].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.loginHistory[uid].push(now); }
	return rs;
};
Bot.prototype.cleanLoginHistory = function (uid) {
	return this.loginHistory[uid] = [];
};
Bot.prototype.addMailHistory = function (email) {
	var self = this;
	var now = new Date().getTime();
	var rs;
	this.mailHistory[email] = dvalue.default(this.mailHistory[email], []);
	var t = this.mailHistory[email].reduce(function (pre, curr) {
		if(now - curr < historyPeriod) { pre++; }
		return pre;
	}, 0);
	this.mailHistory[email].map(function (v, i) {
		if(now - v > historyPeriod) {
			self.mailHistory[email].splice(i, 1);
		}
	});

	rs = (t < 3);
	if(rs) { this.mailHistory[email].push(now); }
	return rs;
};

/* require: email, password(md5) */
/* optional: nickname */
/* 1: invalid e-mail, 2: account exist */
Bot.prototype.addUser = function (user, cb) {
	var self = this;
	var USERPROFILE = formatUser(user);
	var userdata = {type: 'email', profile: USERPROFILE};
	cb = dvalue.default(cb, function () {});
	if(!textype.isEmail(user.email)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		return cb(e);
	}

	// check to merge
	// no merge -> create user
	var condition = {account: user.account, enable: true};
	var subCondition = mergeCondition(userdata);
	/*
	q.fcall(function () { return self.mergeUser(subCondition, USERPROFILE); })
	 .then(function (v) { if(v) { return v; } else { return self.createUser(user); }})
	 */
	q.fcall(function () { return self.createUser(user); })
	 .then(function (v) {
		 var deferred = q.defer();
		 self.createToken(v, function (e, d) {
			 if(e) { deferred.reject(e); }
			 else { deferred.resolve(d); }
		 });
		 return deferred.promise;
	 })
	 .then(function (v) {
		  cb(null, v);
	  },
		function (e) {
			cb(e);
	  })
	 .done();
};
Bot.prototype.createUser = function (user) {
	var deferred = q.defer();
	var self = this;
	var condition = {account: user.email, enable: true};
	var USERPROFILE = formatUser(user);
	USERPROFILE.account = USERPROFILE.email;

	if(!textype.isEmail(user.email)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		deferred.reject(e);
	}
	// check exists
	// create account
	// send mail
	q.fcall(function () { return self.checkUserExist(condition); })
	 .then(function (v) {
		var subdeferred = q.defer();
		if(v) {
			var e = new Error("Occupied e-mail");
			e.code = '22001';
			subdeferred.reject(e);
		}
		else if(self.addMailHistory(user.email)) {
			var collection = self.db.collection('Users');
			USERPROFILE.validcode = dvalue.randomCode(6, {number: 1, lower: 0, upper: 0, symbol: 0});
			collection.insert(USERPROFILE, {}, function (e, d) {
				if(e) {
					e.code = '01001';
					subdeferred.reject(e);
				}
				else {
					subdeferred.resolve(USERPROFILE);
					var bot = self.getBot('Mailer');
					var opt = {email: user.email, validcode: USERPROFILE.validcode};
					self.sendVericicationMail(opt, function () {});
				}
			});
		}
		else {
			var e = new Error("e-mail sending quota exceeded");
			e.code = '42001';
			subdeferred.reject(e);
		}
		return subdeferred.promise; })
		.then(deferred.resolve, deferred.reject)
		.done();
	return deferred.promise;
};
Bot.prototype.sendVericicationMail = function (options, cb) {
	var self = this;
	var bot = this.getBot('Mailer');
	var send;
	if(!textype.isEmail(options.email) && !textype.isObjectID(options.uid)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		return cb(e);
	}

	send = function (data) {
		if(self.addMailHistory(data.email)) {
			var content, template = self.getTemplate('mail_signup.html');
			var tmp = url.parse(self.config.url);
			var uri = dvalue.sprintf('/register/%s/%s', data.email, data.validcode);
			tmp.pathname = path.join(tmp.pathname, uri);
			data.comfirmURL = url.format(tmp);
			content = dvalue.sprintf(template, data.email, data.comfirmURL, data.comfirmURL, data.validcode);
			bot.send(data.email, 'Welcom to iSunTV - Account Verification', content, function () {});
			cb(null, {});
		}
		else {
			var e = new Error('e-mail sending quota exceeded');
			e.code = '42001';
			cb(e);
		}
	}

	if(options.validcode) {
		send(options);
	}
	else {
		var condition;
		if(textype.isObjectID(options.uid)) { condition = {_id: new mongodb.ObjectID(options.uid), verified: {$ne: true}, validcode: {$exists: true}}; }
		else { condition = {account: options.email, verified: {$ne: true}, validcode: {$exists: true}}; }
		var collection = this.db.collection('Users');
		collection.findOne(condition, {}, function (e, d) {
			if(e) { e.code = '01002'; cb(e); }
			else if(!d) { e = new Error('User not found'); e.code = '39102'; cb(e); }
			else {
				if(!textype.isEmail(options.email)) { options.email = d.email; }
				options.validcode = d.validcode;
				options.username = d.username;
				send(options);
			}
		});
	}
};
Bot.prototype.emailVerification = function (user, cb) {
	if(!this.addVerifyHistory(user.account)) { var e = new Error("verification failed too many times"); e.code = 40301; return cb(e); }
	var self = this;
	var condition = {account: user.account, validcode: user.validcode};
	var updateQuery = {$set: {verified: true}, $unset: {validcode: ""}};
	var collection = this.db.collection('Users');
	collection.findAndModify(condition, {}, updateQuery, {}, function (e, d) {
		if(e) { e.code = '01003'; cb(e); }
		else if(!d.value) { e = new Error('incorrect code'); e.code = '19101'; cb(e); }
		else {
			self.cleanVerifyHistory(user.account);
			self.cleanInvalidAccount(condition, function () {});
			self.createToken(d.value, cb);
		}
	});
};
Bot.prototype.cleanInvalidAccount = function (user, cb) {
	var collection = this.db.collection('Users');
	var condition = {account: user.account, enable: {$ne: true}};
	collection.remove(condition, cb);
};

Bot.prototype.getProfile = function (user, cb) {
	var condition = {_id: new mongodb.ObjectID(user.uid)};
	var collection = this.db.collection('Users');
	collection.findOne(condition, {}, function (e, user) {
		if(e) { e.code = '01002'; cb(e); }
		else if(!user) { e = new Error('User not found'); e.code = '39102'; cb(e); }
		else {
			// new field about payment_status
			var methods = ['Free', 'iOS', 'Android' ,'BrainTree'];
			var fees = [{ currency: 'HKD', value: 23 },
					    { currency: 'USD', value: 3 },
					    { currency: 'TWD', value: 90 },
					    { currency: 'RMB', value: 20 }]
			var methodsRandomIdx = Math.floor(Math.random() * methods.length)
			var feesRandomIdx = Math.floor(Math.random() * fees.length)
			payment_status = {
				method: methods[methodsRandomIdx],
				plan: new mongodb.ObjectID(),
				next_charge: new Date().getTime() + (86400 * 30 * 1000),
				fee: fees[feesRandomIdx],
			}

			// extend the original data
			cb(null, dvalue.default(descUser(user), {
				payment_status: payment_status}
			));
		}
	});
};

Bot.prototype.checkUserExist = function (condition) {
	var deferred = q.defer();
	var collection = this.db.collection('Users');
	collection.find(condition).toArray(function (e, d) {
		if(e) { deferred.reject(e); }
		else { deferred.resolve(d[0]); }
	});
	return deferred.promise;
};
Bot.prototype.mergeUser = function (condition, profile) {
	var self = this;
	var collection = this.db.collection("Users");
	return self.checkUserExist(condition).then(function (v) {
		var deferred = q.defer();
		if(v) {
			// merge account with profile
			var cond = {_id: v._id}, set = {}, addToSet, updateQuery;
			for(var k in profile) {
				if(v[k] == undefined || v[k].length == 0) {
					set[k] = profile[k];
					v[k] = profile[k];
				}
			}
			updateQuery = {$set: set};
			var addSet = function (k, v) {
				if(addToSet == undefined) {
					addToSet = {};
					updateQuery['$addToSet'] = addToSet;
				}
				addToSet[k] = v;
			};
			if(set.emails == undefined && !!profile.emails) { addSet('emails', {$each: profile.emails}); }
			if(set.photos == undefined && !!profile.photos) { addSet('photos', {$each: profile.photos}); }

			collection.findAndModify(cond, {}, updateQuery, {}, function (e, d) {
				if(e) { deferred.reject(e); }
				else if(d.value) {
					deferred.resolve(v);
				}
				else {
					deferred.resolve(undefined);
				}
			});
		}
		else {
			// no account to merge
			deferred.resolve(undefined);
		}
		return deferred.promise;
	});
};

Bot.prototype.addUserBy3rdParty = function (USERPROFILE, cb) {
	var deferred = q.defer();
	var collection = this.db.collection('Users');
	collection.insert(USERPROFILE, {}, function (e, d) {
		if(e) { deferred.reject(e); }
		else { deferred.resolve(USERPROFILE); }
	});

	return deferred.promise;
};
Bot.prototype.getUserBy3rdParty = function (user, cb) {
	var self = this;
	var USERPROFILE = formatUser(user.profile);
	USERPROFILE.enable = true;
	USERPROFILE.verified = true;
	// check account existing
	// if account not exists, check mergeable account
	// if account still not exists, create one
	var condition = user.condition;
	var subCondition = mergeCondition(user);
	q.fcall(function () { return self.checkUserExist(condition); })
	// .then(function (v) { if(v) { return v; } else { return self.mergeUser(subCondition, USERPROFILE); }})
	 .then(function (v) { if(v) { return v; } else { return self.addUserBy3rdParty(USERPROFILE); }})
	 .then(function (v) {
			cb(null, v);
	  },
	  function (e) {
			cb(e);
		})
	 .done();
};

Bot.prototype.editUser = function (user, cb) {
	if(typeof(user) != 'object' || user.uid === undefined) {
		var e = new Error('Invalid data');
		e.code = -1;
		return cb(e);
	}
	var cond = {_id: user.uid, role: {$ne: 0}};
	var data = {};
	var dirty = false;
	if(typeof(user.username) == 'string' && user.username.length > 0) { dirty = true; data.username = user.username; }
	if(textype.isEmail(user.email)) { dirty = true; data.email = user.email; }
	if(typeof(user.password) == 'string' && user.password.length > 0) { dirty = true; data.password = user.password; }
	if(!dirty) { return cb(null, {}); }

	var collection = this.db.collection('Users');
	collection.findAndModify(
		cond,
		{},
		{$set: data},
		{},
		function (e, d) {
			if(e) { e.code = 0; return cb(e); }
			else if(!d) {
				e = new Error("user not found");
				e.code = 1;
				return cb(e);
			}
			else {
				return cb(null, {});
			}
		}
	);
};
Bot.prototype.lockUser = function (uid, cb) {
	var cond = {_id: uid, role: {$ne: 0}};
	var updateQuery = {$set: {status: -1}};
	var collection = this.db.collection('Users');
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = 0; return cb(e); }
			else if(!d) {
				e = new Error("user not found");
				e.code = 1;
				return cb(e);
			}
			else {
				return cb(null, {});
			}
		}
	);
};
Bot.prototype.unlockUser = function (uid, cb) {
	var cond = {_id: uid, role: {$ne: 0}};
	var updateQuery = {$set: {status: 1}};
	var collection = this.db.collection('Users');
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = 0; return cb(e); }
			else if(!d) {
				e = new Error("user not found");
				e.code = 1;
				return cb(e);
			}
			else {
				return cb(null, {});
			}
		}
	);
};
Bot.prototype.deleteUser = function (user, cb) {
	var cond = {_id: user.uid, account: user.account, role: {$ne: 0}};
	var collection = this.db.collection('Users');
	collection.remove(cond, function (e, d) {
		if(e) { e.code = 0; return cb(e); }
		else if(!d) {
			e = new Error("user not found");
			e.code = 1;
			return cb(e);
		}
		else {
			return cb(null, {});
		}
	});
};

Bot.prototype.getUserList = function () {
	return this.userlist;
};
Bot.prototype.listUser = function (cb) {
	cb = dvalue.default(cb, function () {});
	var self = this;
	var collection = this.db.collection('Users');
	collection.find({}).toArray(function (e, d) {
		if(e) {
			e.code = 0;
			cb(e);
		}
		else {
			var list = d.map(function (v) {
				return descUser(v);
			});
			cb(null, list);
		}
	});
};

/* require: options.uid */
Bot.prototype.updateLoginTime  = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	var condition = {_id: new mongodb.ObjectID(options.uid), enable: true};
	var updateQuery = {$set: {ltime: new Date().getTime()}};
	var collection = this.db.collection('Users');
	collection.findAndModify(
		condition,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = '01001'; return cb(e); }
			else if(!d.value) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
			else { cb(null, {}); }
		}
	);
};

/* require: mail, password(md5) */
/* 1: not verify, 2: failed */
Bot.prototype.login = function (data, cb) {
	if(!this.addLoginHistory(data.account)) { var e = new Error("login failed too many times"); e.code = 49101; return cb(e); }
	var self = this;
	var collection = this.db.collection('Users');
	var loginData = {account: data.account, password: data.password};
	collection.findOne(loginData, {}, function (e, user) {
		if(e) { return cb(e); }
		else if(!user) {
			e = new Error("incorrect account/password");
			e.code = '19101';
			return cb(e);
		}
		if(!user.enable) {
			e = new Error("Account not verified");
			e.code = '69101';
			e.uid = user._id.toString();
			return cb(e);
		}
		else {
			self.cleanLoginHistory(data.account);
			self.createToken(user, cb);
		}
	});
};
/* create token by user id */
Bot.prototype.createToken = function (user, cb) {
	var self = this;
	if(user._id === undefined) {
		var e = new Error('Invalid User Account');
		e.code = '19101'
		return cb(e);
	}
	var now = new Date().getTime();
	var collection = this.db.collection('Tokens');
	var tbody = dvalue.randomID(24);
	var tcrc = CRC32(tbody);
	var token = {
		_id: new mongodb.ObjectID().toString(),
		uid: user._id,
		token: tbody + tcrc,
		renew: dvalue.randomID(8),
		create: now
	};
	collection.insert(token, {}, function (e, d) {
		delete token._id;
		self.updateLoginTime(token, function () {});
		return cb(e, token);
	});
};
Bot.prototype.checkToken = function (token, cb) {
	if(typeof(token) != 'string' || token.length != 32) { return cb(); }
	var tbody = token.substr(0, 24);
	var tcrc = token.substr(24);
	if(CRC32(tbody) != tcrc) { return cb(); }

	var limit = new Date().getTime() - tokenLife;
	var collection = this.db.collection('Tokens');
	collection.findOne({token: token, create: {$gt: limit}, destroy: {$exists: false}}, {}, function (e, user) {
		if(e) { return cb(e); }
		var user = user || {};
		if(user.uid) { user.uid = user.uid.toString(); }
		cb(null, user);
	});
};
Bot.prototype.destroyToken = function (token, cb) {
	var now = new Date().getTime();
	var collection = this.db.collection('Tokens');
	collection.findAndModify(
		{token: token, destroy: {$exists: false}},
		{},
		{$set: {destroy: now}},
		{},
		cb
	);
};

/* require: token.token, token.renew */
/* 1: invalid token, 2: overdue */
Bot.prototype.renew = function (token, cb) {
	var self = this;
	var code = token.token;
	var renew = token.renew;
	var now = new Date().getTime();
	var collection = this.db.collection('Tokens');
	collection.findAndModify(
		{token: code, renew: renew, destroy: {$exists: false}},
		{},
		{$set: {destroy: now}},
		{},
		function (e, d) {
			if(e) { return cb(e); }
			else if(!d.value) {
				e = new Error("invalid token");
				e.code = '10201';
				return cb(e);
			}
			else if(now - d.value.create > renewLife) {
				e = new Error("overdue token");
				e.code = '70201';
				return cb(e);
			}
			self.createToken({_id: d.value.uid}, cb);
		}
	)
};
/* token */
Bot.prototype.logout = function (token, cb) {
	this.destroyToken(token, function () {});
	cb(null);
};

/* forget password */
/* require: user.email */
Bot.prototype.forgetPassword = function (user, cb) {
	var self = this;
	if(!textype.isEmail(user.email)) {
		var e = new Error("Invalid e-mail");
		e.code = '12001';
		return cb(e);
	}
	var create = new Date().getTime();
	var code = dvalue.randomCode(6, {number: 1, lower: 0, upper: 0, symbol: 0});
	var json = { code: code, create: create };
	var updateQuery = {$set: {reset: json}};
	var collection = this.db.collection('Users');
	var cond = {account: user.email, enable: true};
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = '01002' ; return cb(e); }
			else if(!d.value) {
				e = new Error('User not found');
				e.code = '39102';
				cb(e);
			}
			else {
				if(self.addMailHistory(d.value.email)){
					var bot = self.getBot('Mailer');
					var template = self.getTemplate('mail_pw_reset.html');
					var resetUrl = dvalue.sprintf(self.config.frontend + '?uid=%s&code=%s', d.value._id, code);
					var content = dvalue.sprintf(template, user.email, resetUrl, code);
					bot.send(user.email, 'Welcome to iSunTV - Forget password', content, function () {});
					cb(null, { uid:d.value._id });
				}
				else{
					e = new Error('e-mail sending quota exceeded');
					e.code = '42001';
					cb(e);
				}
			}
		}
	);
};

/* check reset password code */
/* require: options.resetcode, options.uid */
Bot.prototype.checkResetPassword = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	if(!this.addResetHistory(options.uid)) { var e = new Error("reset failed too many times"); e.code = 49102; return cb(e); }
	var self = this;
	var cond = {
		_id: new mongodb.ObjectID(options.uid),
		'reset.code': options.resetcode,
		'reset.create': {$gt: new Date().getTime() - ResetLife},
		enable: true,
	};
	var collection = this.db.collection('Users');
	collection.findOne(cond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!user) {
			e = new Error("invalid reset code");
			e.code = '19104';
			return cb(e);
		}
		else {
			self.cleanResetHistory(options.uid);
			return cb(null, {});
		}
	});
};

/* reset password */
/* require: options.resetcode, options.password, options.uid */
Bot.prototype.resetPassword = function (options, cb) {
	if(!textype.isObjectID(options.uid)) { var e = new Error('user not found'); e.code = '39102'; return cb(e); }
	if(!this.addResetHistory(options.uid)) { var e = new Error("reset failed too many times"); e.code = 49102; return cb(e); }
	var self = this;
	var cond = {
		_id: new mongodb.ObjectID(options.uid),
		'reset.code': options.resetcode,
		'reset.create': {$gt: new Date().getTime() - ResetLife},
		enable: true,
	};
	var collection = this.db.collection('Users');
	collection.findOne(cond, {}, function (e, user) {
		if(e) { e.code = '01002'; return cb(e); }
		else if(!user) {
			e = new Error("invalid reset code");
			e.code = '19104';
			return cb(e);
		}
		else if (user.password == options.password){
			e = new Error("duplicate password");
			e.code = '29101';
			return cb(e);
		}
		else {
			var updateQuery = {$set: {password: options.password}, $unset: {reset: ''}};
			collection.findAndModify(
				cond,
				{},
				updateQuery,
				{},
				function (e, d) {
					if(e) { e.code = '01002'; return cb(e); }
					else if(!d.value) {
						e = new Error("invalid reset code");
						e.code = '19104';
						return cb(e);
					}
					else {
						self.cleanResetHistory(options.uid);
						self.cleanLoginHistory(d.value.account);
						return cb(null, {});
					}
				}
			);
		}
	});
};

/* change password */
/* require: user.uid, user.password_old, user.password_new */
Bot.prototype.changePassword = function (user, cb) {
	if(typeof(user) != 'object' || user.uid == undefined) {
		var e = new Error('Invalid user data');
		e.code = '19102';
		return cb(e);
	}
	var cond = {_id: new mongodb.ObjectID(user.uid), password: user.password_old};
	var updateQuery = {$set: {password: user.password_new}};
	var collection = this.db.collection('Users');
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { e.code = 0; return cb(e); }
			else if(!d.value) {
				e = new Error("incorrect old password");
				e.code = '19103';
				return cb(e);
			}
			else {
				return cb(null, {});
			}
		}
	);
};

Bot.prototype.encryptPassword = function (password) {
	var salt = ":iSunCloud";
	var md5sum = crypto.createHash('md5');
	md5sum.update(password).update(salt);
	return md5sum.digest('hex');
};

module.exports = Bot;
