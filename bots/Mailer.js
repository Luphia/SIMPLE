const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');

const Parent = require(path.join(__dirname, '_Bot.js'));

var db, logger;

var Bot = class extends Parent {
	constructor() {
		super();
		this.name = path.parse(__filename).base.replace(/.js$/, '');
	}
	init(config) {
		return super.init(config).then(v => {
			logger = this.logger;
			db = this.db;
			// do something
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

	send(email, subject, content) {
		var mailTransport = nodemailer.createTransport(smtpTransport(this.config.mail));
		var mailOptions = {
			from: this.config.mail.auth.user,
			subject: subject,
			html: content
		};
		if(Array.isArray(email)) {
			mailOptions.bcc = email;
		}
		else {
			mailOptions.to = email;
		}

		return new Promise((resolve, reject) => {
			mailTransport.sendMail(mailOptions, (e, d) => {
				if(e) { reject(e); }
				else { resolve(d); }
			});
		});
	}
};

module.exports = Bot;