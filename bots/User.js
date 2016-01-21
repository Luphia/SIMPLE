const ParentBot = require('./_Bot.js');
const util = require('util');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	Receptor.super_.prototype.init.call(this, config);
};

Bot.prototype.start = function () {

};

Bot.prototype.regist = function () {};
Bot.prototype.sendValidCode = function () {};
Bot.prototype.identify = function () {};
Bot.prototype.login = function () {};
Bot.prototype.renew = function () {};
Bot.prototype.logout = function () {};

module.exports = Bot;
