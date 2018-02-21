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
		logger.trace('Yo');
		logger.debug('Yo');
		logger.info('Yo');
		logger.warn('Yo');
		logger.error('Yo');
		logger.fatal('Yo');

		// assign api
		super.getBot('Receptor').then(receptor => {
			// method: get, post, put, delete, all
			receptor.register(
				{method: 'all', authorization: false, hashcash: false},
				'/test',
				(options) => { return this.myaction(options); }
			);

			// with params
			receptor.register(
				{method: 'get', authorization: false, hashcash: false},
				'/test/:x',
				(options) => { return this.myaction(options); }
			);

			// multi-path
			receptor.register(
				{method: 'get', authorization: false, hashcash: false},
				['/test/:x/:y', '/test/:x/:y/:z'],
				(options) => { return this.myaction(options); }
			);
		});

		return super.start();
	}
	ready() {
		return super.ready().then(v => {
			return Promise.resolve(v);
		});
	}

	myaction(options) {
		if(Math.random() > 0.3) {
			return Promise.resolve(options);
		}
		else {
			var e = new Error('something wrong');
			e.code = '01010101';
			return Promise.reject(e);
		}
		
	}
};

module.exports = Bot;