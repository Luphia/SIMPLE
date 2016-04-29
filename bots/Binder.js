const ParentBot = require('./_Bot.js');
const util = require('util');
const mongodb = require('mongodb');
const dvalue = require('dvalue');

var logger;

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  Bot.super_.prototype.init.call(this, config);
  logger = config.logger;
};

Bot.prototype.start = function () {
  var self = this;
};

Bot.prototype.bindMail = function (data, cb) {
	var self = this;
	var cname = ["SIMPLE", "account"]
	var collection = this.db.collection(cname);
	// check email exists

	// add machine to email
};

Bot.prototype.bindSubdomain = function () {

};

Bot.prototype.login = function () {

};

module.exports = Bot;
