/*
	- call another bot: super.findBot('bot name ignore case')
		-> return Promise resolve bot
 */
const path = require('path');

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
		return super.start();
	}
};

module.exports = Bot;