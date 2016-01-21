const ParentBot = require('./_Bot.js');
const util = require('util');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {

};

Bot.prototype.start = function () {

};

module.exports = Bot;
