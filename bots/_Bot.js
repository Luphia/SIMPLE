var Bots = [];

var Bot = class {
	constructor() {
		Bots.push(this);
	}
	init({config, db, logger, i18n}) {
		this.config = config;
		this.db = db;
		this.logger = logger;
		this.i18n = i18n;
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