const ParentBot = require('./_Bot.js');
const util = require('util');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

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

Bot.prototype.send = function (email, content, cb) {
	var mailTransport = nodemailer.createTransport(smtpTransport({}));

	var mailOptions = {
		from: 'noreply@isuncloud.com',
		to: email,
		subject: 'Welcome to iSunCloud - account verification',
		html: content
	};
	mailTransport.sendMail(mailOptions, function(e, d) {});
};

module.exports = Bot;
