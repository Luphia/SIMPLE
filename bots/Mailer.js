const ParentBot = require('./_Bot.js');
const util = require('util');
const fs = require('fs');
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
	/*
	var self = this;
	var tmplPath = './resources/login-mail.tmpl';
	var tmpl = fs.readFile(tmplPath, "utf8", function (e, d) {
		console.log(e, d);
		if(e) { return; }
		self.send('luphiaccw@gmail.com', '登入 iSunCloud', d, function (e1, d1) {
			console.log(e1, d1);
		});
	});
	*/
};

Bot.prototype.send = function (email, subject, content, cb) {
	var self = this;
	var mailTransport = nodemailer.createTransport(smtpTransport(self.config.mail));

	var mailOptions = {
		from: 'noreply@isuncloud.com',
		to: email,
		subject: subject,
		html: content
	};
	mailTransport.sendMail(mailOptions, cb);
};

module.exports = Bot;
