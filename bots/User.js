const mongodb = require('mongodb');
const fs = require('fs');
const url = require('url');
const path = require('path');
const dvalue = require('dvalue');
const textype = require('textype');
const request = require('ecrequest');

const User = require(path.join(__dirname, '../models/User'));
const Token = require(path.join(__dirname, '../models/Token'));
const Code = require(path.join(__dirname, '../models/Code'));

const Parent = require(path.join(__dirname, '_Bot.js'));

var db, logger, i18n, APIURL, historyPeriod, tokenLife, renewLife;

var Bot = class extends Parent {
	constructor() {
		super();
		this.name = path.parse(__filename).base.replace(/.js$/, '');
	}
	get tokenParser() {
		var parser = (req, res, next) => {
			if(req.headers.authorization) {
				var token = req.headers.authorization.replace(/^Bearer /, '').trim();
				this.tokenCheck(token).then(uid => {
					req.session.uid = uid;
					req.session.token = token;
					next();
				}).catch(e => {
					next();
				});
			}
			else {
				next();
			}
		}
		return parser;
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
			tokenLife = config.auth.tokenLife;
			renewLife = config.auth.renewLife;
			return Promise.resolve(v);
		}).then(v => {
			super.getBot('Receptor').then(receptor => {
				// token parser
				receptor.tokenParser = this.tokenParser;

				// user register
				receptor.register(
					{method: 'post', authorization: false, hashcash: true},
					'/register',
					(options) => { return this.apiUserRegister(options); }
				);

				// user login
				receptor.register(
					{method: 'post', authorization: false, hashcash: true},
					'/login',
					(options) => { return this.apiUserLogin(options); }
				);

				// user logout
				receptor.register(
					{method: 'get', authorization: false, hashcash: false},
					'/logout',
					(options) => { return this.apiUserLogout(options); }
				);

				// user profile
				receptor.register(
					{method: 'get', authorization: true, hashcash: false},
					'/profile',
					(options) => { return this.apiUserProfile(options); }
				);

				// token renew
				receptor.register(
					{method: 'get', authorization: true, hashcash: false},
					'/token/:token/:password',
					(options) => { return this.apiTokenRenew(options); }
				);

				// token destroy
				receptor.register(
					{method: 'delete', authorization: true, hashcash: false},
					'/token/:token',
					(options) => { return this.apiTokenDestroy(options); }
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
	apiUserLogout(options) {
		var data = options.body || {};
		var user = {
			uid: options.session.uid,
			token: options.session.token
		};
		return this.userLogout(user);
	}
	apiUserProfile(options) {
		var data = options.body || {};
		var user = {
			uid: options.session.uid
		};
		return this.userProfile(user);
	}
	apiTokenRenew(options) {
		var data = {
			token: options.params.token,
			password: options.params.password
		};
		return this.tokenRenew(data);
	}
	apiTokenDestroy(options) {
		var data = {
			token: options.params.token
		};
		return this.tokenDestroy(data);
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
		var uid;
		if(!user.displayname) {
			// 
			if(user.email) {
				user.displayname = user.email.split('@')[0];
			}
		}

		// check user exisits -> create user -> send email (不受 email 次數限制)
		return this.userExists(user).then(result => {
			return new Promise((resolve, reject) => {
				if(result) {
					var error = new Code(29101);
					reject(error);
				}
				else {
					resolve(user);
				}
			});
		}).then(result => {
			return this.userCreate(user);
		}).then(result => {
			uid = result.uid;
			return this.sendVericication(user);
		}).then(result => {
			return this.userLogin(user);
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
						this.tokenCreate({uid: userModel.uid}).then(token => {
							let result = token.toAPI();
							result._session_uid = userModel.uid;
							result._session_token = token.token;
							resolve(result);
						}).catch(error => {
							reject(error);
						});
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
		user = user || {};
		this.tokenDestroy(user);
		return Promise.resolve({"_session_uid": null});
	}
	userProfile(user) {
		var userModel, condition, collection;
		user = user || {};
		if(!user.uid) {
			let e = new Code(10201);
			return Promise.reject(e);
		}
		userModel = new User(user);
		condition = userModel.condition;
		collection = db.collection(User.TABLENAME);
		return new Promise((resolve, reject) => {
			collection.find(condition, {}).toArray((e, d) => {
				if(e) {
					e.code = '01002';
					reject(e);
				}
				else if(d.length == 0) {
					e = new Code('01002');
					reject(e);
				}
				else {
					userModel = new User(d[0]);
					resolve(userModel.toAPI());
				}
			});
		});
	}
	tokenCreate(user) {
		user.lifetime = tokenLife;
		user.destroytime = renewLife;
		var token = new Token(user);
		var data = token.toDB();
		var collection = db.collection(Token.TABLENAME);
		return new Promise((resolve, reject) => {
			collection.insert(data, (e, d) => {
				if(e) {
					e.code = '01001';
					reject(e);
				}
				else {
					resolve(token);
				}
			});
		});
	}
	tokenCheck(token) {
		var token = new Token({token: token});
		var condition = token.condition;
		var collection = db.collection(Token.TABLENAME);
		return new Promise((resolve, reject) => {
			collection.find(condition, {}).toArray((e, d) => {
				if(e) {
					e.code = '01002';
					reject(e);
				}
				else if(d.length == 0) {
					e = new Code(10201);
					reject(e);
				}
				else {
					resolve(d[0].uid);
				}
			});
		});
	}
	tokenRenew(options) {
		options = options || {};
		if(typeof(options.password) != 'string') {
			options.password = '';
		}

		if(Token.check(options.token)) {
			var token = new Token(options);
			var condition = token.condition;
			var collection = db.collection(Token.TABLENAME);
			return new Promise((resolve, reject) => {
				collection.find(condition, {}).toArray((e, d) => {
					if(e) {
						e.code = '01002';
						reject(e);
					}
					else if(d.length == 0) {
						e = new Code(10201);
						reject(e);
					}
					else {
						resolve(d[0]);
					}
				});
			}).then(data => {
				let oldtoken = new Token(data);
				let newToken = oldtoken.renew();
				let updateQuery = oldtoken.updateQuery;
				return new Promise((resolve, reject) => {
					collection.findAndModify(condition, {}, updateQuery, (e, d) => {
						if(e) {
							e.code = '01003';
							reject(e);
						}
						else {
							resolve(newToken);
						}
					});
				});
			}).then(token => {
				let data = token.toDB();
				return new Promise((resolve, reject) => {
					collection.insert(token, (e, d) => {
						if(e) {
							e.code = '01001';
							reject(e);
						}
						else {
							resolve(token.toAPI());
						}
					});
				});
			});
		}
		else {
			var e = new Code(12101);
			return Promise.reject(e);
		}
	}
	tokenDestroy(user) {
		user = user || {};
		if(user.token) {
			var now = new Date().getTime();
			var token = new Token(user);
			var condition = token.condition;
			var collection = db.collection(Token.TABLENAME);
			token.destroy = now;
			var updateQuery = token.updateQuery;
			return new Promise((resolve, reject) => {
				collection.findAndModify(condition, {}, updateQuery, {}, (e, d) => {
					if(e) {
						e.code = '01003';
						reject(e);
					}
					else {
						resolve(true);
					}
				});
			})

		}
		else {
			return Promise.resolve(true);
		}
	}
};

module.exports = Bot;
