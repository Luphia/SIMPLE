var Bot = function(config) {
	this.init(config);
};

Bot.prototype.init = function(config) {
	config && (this.config = config);
	this.active = false;
};

Bot.prototype.start = function() {
	this.active = true;
};

Bot.prototype.stop = function() {
	this.active = false;
};

Bot.prototype.reset = function() {

};

Bot.prototype.exec = function(command) {
	command = this.translate(command);
	// do something
};

Bot.prototype.randomID = function() {
	var string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	,	l = 8
	,	rs = "";
	for(var i = 0; i < l; i++) {
		rs += string[ Math.floor(Math.random() * string.length) ];
	}
	return rs;
};

Bot.prototype.translate = function(command) {
	return command;
};

module.exports = Bot;