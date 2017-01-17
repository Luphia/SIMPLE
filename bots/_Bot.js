var Bots = [];

var Bot = class {
	constructor() {
		Bots.push(this);
	}
	init(config) {
		this.config = {};
		for(var k in config) {
			if(!/^_/.test(k)) { this.config[k] = config[k]; }
		}
		this.db = config._db;
		this.logger = config._logger;
		this.i18n = config._i18n;
		return Promise.resolve(this);
	}
	start() {
		return Promise.resolve(true);
	}
	ready() {
		return Promise.resolve(true);
	}
	getBot(name) {
		var condition = new RegExp('^' + name + '$', 'i');
		var bot = Bots.find(function (b) { return condition.test(b.name) });
		return Promise.resolve(bot);
	}
};

module.exports = Bot;