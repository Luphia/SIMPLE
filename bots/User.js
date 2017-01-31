const mongodb = require('mongodb');
const fs = require('fs');
const url = require('url');
const path = require('path');
const dvalue = require('dvalue');
const textype = require('textype');
const request = require('ecrequest');

const User = require(path.join(__dirname, '../Models/User'));
const Code = require(path.join(__dirname, '../Models/Code'));

const Parent = require(path.join(__dirname, '_Bot.js'));

var db, logger, i18n, APIURL, historyPeriod;

var Bot = class extends Parent {
	constructor() {
		super();
		this.name = path.parse(__filename).base.replace(/.js$/, '');
	}
	init(config) {
		this.mailHistory = {};
		this.loginHistory = {};
		this.verifyHistory = {};
		this.resetHistory = {};
		return super.init(config).then(v => {
			i18n = this.i18n;
			logger = this.logger;
			db = this.db;
			APIURL = config.main.url;
			historyPeriod = config.auth.historyPeriod;
			return Promise.resolve(v);
		}).then(v => {
			// user register
			super.getBot('Receptor').then(receptor => {
				receptor.register(
					{method: 'post', authorization: false, hashcash: true},
					'/register',
					(options) => { return this.apiUserRegister(options); }
				);
			});

			// user login
			super.getBot('Receptor').then(receptor => {
				receptor.register(
					{method: 'post', authorization: false, hashcash: true},
					'/login',
					(options) => { return this.apiUserLogin(options); }
				);
			});

			return Promise.resolve(v);
		});
	}
	start() {
		return super.start().then(v => {
			// do something
			return Promise.resolve(v);
		});
	}
	ready() {
		return super.ready().then(v => {
			// do something
			return Promise.resolve(v);
		});
	}

	apiUserRegister(options) {
		var user = options.body;
		return this.userRegister(user);
	}
	apiUserLogin(options) {
		var data = options.body || {};
		var user = {
			account: data.account || data.email,
			password: data.password
		};
		return this.userLogin(user);
	}
	addVerifyHistory(uid) {
		var now = new Date().getTime();
		var rs;
		this.verifyHistory[uid] = dvalue.default(this.verifyHistory[uid], []);
		var t = this.verifyHistory[uid].reduce((pre, curr) => {
			if(now - curr < historyPeriod) { pre++; }
			return pre;
		}, 0);
		this.verifyHistory[uid].map((v, i) => {
			if(now - v > historyPeriod) {
				this.verifyHistory[uid].splice(i, 1);
			}
		});

		rs = (t < 3);
		if(rs) { this.verifyHistory[uid].push(now); }
		return rs;
	}
	cleanVerifyHistory(uid) {
		return this.verifyHistory[uid] = [];
	}
	addResetHistory(uid) {
		var self = this;
		var now = new Date().getTime();
		var rs;
		this.resetHistory[uid] = dvalue.default(this.resetHistory[uid], []);
		var t = this.resetHistory[uid].reduce((pre, curr) => {
			if(now - curr < historyPeriod) { pre++; }
			return pre;
		}, 0);
		this.resetHistory[uid].map((v, i) => {
			if(now - v > historyPeriod) {
				self.resetHistory[uid].splice(i, 1);
			}
		});

		rs = (t < 3);
		if(rs) { this.resetHistory[uid].push(now); }
		return rs;
	}
	cancelResetHistory(uid) {
		if(Array.isArray(this.resetHistory[uid])) {
			this.resetHistory[uid].pop();
		}
		return true;
	}
	cleanResetHistory(uid) {
		return this.resetHistory[uid] = [];
	}
	addLoginHistory(uid) {
		var now = new Date().getTime();
		var rs;
		this.loginHistory[uid] = dvalue.default(this.loginHistory[uid], []);
		var t = this.loginHistory[uid].reduce((pre, curr) => {
			if(now - curr < historyPeriod) { pre++; }
			return pre;
		}, 0);
		this.loginHistory[uid].map((v, i) => {
			if(now - v > historyPeriod) {
				this.loginHistory[uid].splice(i, 1);
			}
		});

		rs = (t < 3);
		if(rs) { this.loginHistory[uid].push(now); }
		return rs;
	}
	cleanLoginHistory(uid) {
		return this.loginHistory[uid] = [];
	}
	addMailHistory(email) {
		var now = new Date().getTime();
		var rs;
		this.mailHistory[email] = dvalue.default(this.mailHistory[email], []);
		var t = this.mailHistory[email].reduce((pre, curr) => {
			if(now - curr < historyPeriod) { pre++; }
			return pre;
		}, 0);
		this.mailHistory[email].map((v, i) => {
			if(now - v > historyPeriod) {
				this.mailHistory[email].splice(i, 1);
			}
		});

		rs = (t < 3);
		if(rs) { this.mailHistory[email].push(now); }
		return rs;
	}

	userRegister(user) {
		// check user exisits -> create user -> send email (不受 email 次數限制)
		return this.userExists(user).then(result => {
			return new Promise((resolve, reject) => {
				if(result) {
					var error = e = new Code(29101);
					reject(error);
				}
				else {
					resolve(user);
				}
			});
		}).then(result => {
			return this.userCreate(user);
		}).then(result => {
			return this.sendVericication(user);
		});
	}
	userExists(user) {
		var userModel = new User(user);
		var condition = userModel.condition;
		var collection = db.collection(User.TABLENAME);
		return new Promise((resolve, reject) => {
			collection.find(condition).toArray((error, data) => {
				if(error) {
					error.code = "01002";
					reject(error);
				}
				else {
					if(data && data.length > 0) { resolve(true); }
					else { resolve(false); }
				}
			});
		});
	}
	userCreate(user) {
		var userModel = new User(user);
		var dbRecord = userModel.toDB();
		var collection = db.collection(User.TABLENAME);
		if(!textype.isEmail(user.email)) {
			var e = e = new Code(12001);
			return Promise.reject(e);
		}
		return new Promise((resolve, reject) => {
			collection.insert(dbRecord, {}, (e, d) => {
				if(e) {
					e.code = "01001";
					reject(e);
				}
				else {
					userModel.uid = dbRecord._id;
					resolve(userModel.toAPI());
				}
			});
		});
	}
	sendVericication(user) {
		return Promise.resolve();
	}
	verificationEmail() {

	}
	verificationPhone() {

	}
	userLogin(user) {
		var userModel = new User(user);
		if(!this.addLoginHistory(user.account)) {
			var e = new Code(49101);
			return Promise.reject(e);
		}
		var password = user.password;
		var condition =  userModel.condition;
		var collection = db.collection(User.TABLENAME);
		return new Promise((resolve, reject) => {
			collection.findOne(condition, {}, (e, d) => {
				if(e) {
					e.code = "01002";
					reject(e);
				}
				else if(d) {
					userModel.profile = d;
					if(userModel.checkPassword(password)) {
						this.cleanLoginHistory(user.account);
						let result = userModel.profile;
						result._session_uid = userModel.uid;
						resolve(result);
					}
					else {
						e = new Code(19101);
						reject(e);
					}
				}
				else {
					e = new Code(19101);
					reject(e);
				}
			});
		});
	}
	userLogout(user) {

	}
	tokenCreate(user) {

	}
	tokenRenew(user) {

	}
	tokenDestroy(user) {
		
	}
};

module.exports = Bot;
