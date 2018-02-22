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
		// assign api
		super.getBot('Receptor').then(receptor => {
			// method: get, post, put, delete, all
			receptor.register(
				{method: 'all', authorization: false, hashcash: false},
				'/ping',
				(options) => { return this.ping(options); }
			);
		});

		return super.start();
	}
	ready() {
		return super.ready().then(v => {
			return Promise.resolve(v);
		});
	}

	ping(options) {
		return Promise.resolve(options);
	}
};

module.exports = Bot;