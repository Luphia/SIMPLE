var SocketBot = require('./_SocketBot.js')
,	util = require('util')
,	log4js = require('log4js')
,	express = require('express')
,	Session = require('express-session')
,	favicon = require('serve-favicon')
,	fs = require('fs')
,	path = require('path')
,	bodyParser = require('body-parser')
,	multer  = require('multer')
,	Result = require('../classes/Result.js');

var Receptor = function(config) {
	this.init(config);
};

util.inherits(Receptor, SocketBot);

Receptor.prototype.init = function(config) {
	Receptor.super_.prototype.init.call(this, config);
	var self = this;

	var upload = "./uploads/";
	if (!fs.existsSync(upload)){
		fs.mkdirSync(upload);
	}
	var logs = "./logs/";
	if (!fs.existsSync(logs)){
		fs.mkdirSync(logs);
	}

	log4js.configure({
		"appenders": [
			{ "type": "console" },
			{ "type": "dateFile", "filename": "./logs/catering", "category": "catering.log", "pattern": "-yyyy-MM-dd.log", "alwaysIncludePattern": true, "backups": 365 },
			{ "type": "file", "filename": "./logs/catering.exception.log", "category": "catering.exception", "maxLogSize": 10485760, "backups": 10 },
			{ "type": "file", "filename": "./logs/catering.threat.log", "category": "catering.threat", "maxLogSize": 10485760, "backups": 10 }
		],
		"replaceConsole": true
	});

	this.router = express.Router();
	this.app = express();
	this.http = require('http').createServer(this.app);
	this.session = Session({
		secret: this.randomID(),
		resave: true,
		saveUninitialized: true
	});

	this.app.set('port', 80);
	this.app.use(log4js.connectLogger(log4js.getLogger('catering.log'), { level: log4js.levels.INFO, format: ':remote-addr :user-agent :method :url :status - :response-time ms' }));
	this.app.use(this.session);
	this.app.use(bodyParser.urlencoded({ extended: false }));
	this.app.use(bodyParser.json({limit: '100mb'}));
	this.app.use(multer({ dest: './uploads/', limit: '100mb'}));
	this.app.use(this.filter);
	this.app.use(express.static(path.join(__dirname, '../public')));
	this.app.use(this.router);
	this.app.use(this.response);

	this.ctrl = [];

	/*
    this.router.all('/', function(req, res, next) {
            res.writeHead(302, {'Location': 'http://210.61.13.14'});
            res.end();
    });
	*/
	// this.router.all('*', function(req, res, next) { self.route(req, res, next); });
};

Receptor.prototype.addController = function(ctrl) {
	var self = this;
	if(ctrl.name) { self.ctrl[ctrl.name] = ctrl; }
	ctrl.setAsk(function(msg, tag) {
		var rs = self.api(msg, tag);
		return rs;
	});

	if(!Array.isArray(ctrl.path)) {
		ctrl.path = [ctrl.path];
	}

	for(var k in ctrl.path) {
		if(!ctrl.path[k]) { continue; }

		if(typeof(ctrl.path[k]) == "string") { ctrl.path[k] = {"method": "all", "path": ctrl.path[k]}; }
		var method = (ctrl.path[k].method || 'all').toLowerCase()
		,	path = ctrl.path[k].path;

		if(typeof(this.router[method]) == "function") {
			this.router[method](path, function(req, res, next) {
				var msg = {
					"url": req._parsedOriginalUrl.pathname,
					"method": req.method,
					"params": req.params,
					"query": req.query,
					"body": req.body,
					"sessionID": req.sessionID,
					"session": req.session,
					"files": req.files
				};

				result = ctrl.exec(msg, function(err, data) {
					res.send(data);
				});

				if(!result) {
					res.result = typeof(result.toJSON) == 'function'? result: new Result(result);
					next();
				}
			});
		}
	}
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
	res.result = new Result();
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
	next();
};

Receptor.prototype.response = function(req, res, next) {
	var result, session;

	if(result = res.result) {
		if(session = result.getSession()) {
			for(var key in session) {
				if(session[key] === null) {
					delete req.session[key];
				}
				else {
					req.session[key] = session[key];
				}
			}
		}
	}
	else {
		result = new Result();
		result.setMessage("Invalid operation");
	}

	res.send(result.toJSON());
};

Receptor.prototype.api = function(msg, tag) {
	var rs = this.ctrl[tag].exec(msg);
	return rs;
};

module.exports = Receptor;