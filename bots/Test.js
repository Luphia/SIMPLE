/*
	- call another bot: super.findBot('bot name ignore case')
		-> return Promise resolve bot
 */


const path = require('path');

const Parent = require(path.join(__dirname, '_Bot.js'));
var Bot = class extends Parent {
	constructor() {
		super();
		this.name = path.parse(__filename).base.replace(/.js$/, '');
	}
	init(config) {
		return super.init(config).then(v => {
			// do something
			console.log(config);
			return Promise.resolve(v);
		});
	}
	start() {
		this.logger.trace('Yo');
		this.logger.debug('Yo');
		this.logger.info('Yo');
		this.logger.warn('Yo');
		this.logger.error('Yo');
		this.logger.fatal('Yo');
		return super.start();
	}
};

module.exports = Bot;