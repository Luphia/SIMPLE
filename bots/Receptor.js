var SocketBot = require('./_SocketBot.js')
,	util = require('util')
,	express = require('express')
,	Session = require('express-session')
,	favicon = require('serve-favicon')
,	fs = require('fs')
,	path = require('path')
,	bodyParser = require('body-parser');

var Receptor = function(config) {
	this.init(config);
};

util.inherits(Receptor, SocketBot);

Receptor.prototype.init = function(config) {
	Receptor.super_.prototype.init.call(this, config);
	var self = this;

	this.router = express.Router();
	this.app = express();
	this.http = require('http').createServer(this.app);
	this.session = Session({
		secret: this.randomID(),
		resave: true,
		saveUninitialized: true
	});

	this.app.set('port', 80);
	this.app.use(this.session);
	this.app.use(this.filter);
	this.app.use(bodyParser.urlencoded({ extended: false }));
	this.app.use(bodyParser.json());
	this.app.use(express.static(path.join(__dirname, '../public')));
	this.app.use(this.router);

	this.router.all('*', function(req, res, next) { self.route(req, res, next); });
};

Receptor.prototype.start = function() {
	Receptor.super_.prototype.start.apply(this);
	var self = this;
	
	var httpPort = this.app.get('port');
	this.http.listen(httpPort, function () {});
};

Receptor.prototype.stop = function() {
	Receptor.super_.prototype.stop.apply(this);
	this.http.close();
};

Receptor.prototype.filter = function(req, res, next) {
	res.header("Access-Control-Allow-Origin", "*");
	next();
};

Receptor.prototype.route = function(req, res, next) {
	var msg = {
		"url": req.originalUrl,
		"method": req.method,
		"params": req.params,
		"query": req.query,
		"body": req.body,
		"sessionID": req.sessionID,
		"session": req.session
	};

	var tag = msg.url.substr(1).split('/').join('.');
	res.send( this.random(msg, 1, [tag], 10000)[0] );
};

module.exports = Receptor;