const ParentBot = require('./_Bot.js');
const util = require('util');
const raid2x = require('raid2x');
const dvalue = require('dvalue');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Bot.super_.prototype.init.call(this, config);
};

Bot.prototype.start = function () {

};

/* email, password(md5) */
Bot.prototype.regist = function (email, password, cb) {
	// check email

	// check exist
	this.db.find('Users', {email: email}, function (e, d) {
		
	});
};
/* email */
Bot.prototype.sendValidCode = function () {};
/* email, code */
Bot.prototype.verify = function () {
	// verify
	// generateKey
};
/* email, password(md5) */
Bot.prototype.login = function () {};
/* token, refreshToken */
Bot.prototype.renew = function () {};
/* token */
Bot.prototype.logout = function () {};

module.exports = Bot;
