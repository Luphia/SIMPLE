/*
	- call another bot: super.findBot('bot name ignore case')
		-> return Promise resolve bot
 */
const path = require('path');

const Parent = require(path.join(__dirname, '_Bot.js'));

var db, logger, i18n;

var Bot = class extends Parent {
	constructor() {
		super();
		this.name = path.parse(__filename).base.replace(/.js$/, '');
	}
	init(config) {
		return super.init(config).then(v => {
			i18n = this.i18n;
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
};

module.exports = Bot;