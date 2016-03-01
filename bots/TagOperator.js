const ParentBot = require('./_Bot.js');
const util = require('util');
const path = require('path');
const mongodb = require('mongodb');
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

Bot.prototype.listTags = function () {};
Bot.prototype.asignTag = function () {};
Bot.prototype.listAlbums = function () {};
Bot.prototype.asignAlbums = function () {};
Bot.prototype.listFilesByTags = function () {};
Bot.prototype.listFilesByAlbums = function () {};


module.exports = Bot;
