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
,	ncp = require('ncp').ncp
,	exec = require('child_process').exec
,	Result = require('../classes/Result.js');

var Receptor = function(config) {
	this.init(config);
};

util.inherits(Receptor, SocketBot);

Receptor.prototype.init = function(config) {
	Receptor.super_.prototype.init.call(this, config);
	var self = this;
	this.serverPort = [3000, 80];
	this.modules = {};

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
	this.http.on('error', function(err) {
		if(err.syscall == 'listen') {
			var nextPort = self.serverPort.pop() || self.listening + 1;
			self.startServer(nextPort);
		}
		else {
			throw err;
		}
	});
	this.http.on('listening', function() {
		console.log('Receptor is listening on port: %d', self.listening);
	});

	this.session = Session({
		secret: this.randomID(),
		resave: true,
		saveUninitialized: true
	});

	this.app.set('port', this.serverPort.pop());
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

Receptor.prototype.addController = function(ctrl, moduleName) {
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

		if(typeof(moduleName) == "string") { path = "/" + moduleName + path; }

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

				var result = ctrl.exec(msg, function(err, data) {
					res.result = data;
					if(typeof(data.toJSON) == 'function') {
						res.result = new Result();
						result.setResult(!!data);
						result.setData(data);
					}
					next();
				});

				if(result) {
					res.result = typeof(result.toJSON) == 'function'? result: new Result(result);
					next();
				}
			});
		}
	}
};

Receptor.prototype.installModule = function(module) {
	module = encodeURIComponent(module);
	var child = exec('npm install ' + module, function(error, stdout, stderr) {
		if (error !== null) {
			console.log('exec error: ' + error);
		}
	});
};
Receptor.prototype.loadModule = function(module) {
	module = encodeURIComponent(module);
	if(!!this.modules[module]) { return true; }

	try {
		var simpleM = require(module);
		this.modules[module] = simpleM;

		this.addStaticServer(module, simpleM.public);
		for(var k in simpleM.bots) {
			var bot = new simpleM.bots[k]();
			bot.name = k;
			this.addController(bot, module);
		}
	}
	catch(e) {
		console.log(e);
		return false;
	}
};
Receptor.prototype.addStaticServer = function(moduleName, source) {
	var destination = path.join(__dirname, '../public/', moduleName);
	console.log(destination);
	console.log(source);

	ncp(source, destination, function (err) {
		if (err) {
			return console.error(err);
		}
	});
};

Receptor.prototype.start = function() {
	Receptor.super_.prototype.start.apply(this);
	var self = this;
	
	var httpPort = this.app.get('port');
	this.startServer(httpPort);
};

Receptor.prototype.startServer = function(port) {
	this.listening = port;
	this.http.listen(port, function() {});
}

Receptor.prototype.stop = function() {
	Receptor.super_.prototype.stop.apply(this);
	this.http.close();
};

Receptor.prototype.filter = function(req, res, next) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
	if(!req.session.ip) { req.session.ip = ip; }
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
	next();
};

Receptor.prototype.response = function(req, res, next) {
	var result = res.result
	,	session;

	if(result) {
		if(typeof(result.getSession) == 'function') {
			session = result.getSession();

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

	if(typeof(result.toJSON) == 'function') {
		var json = result.toJSON();

		switch(json.message) {
			case 'csv':
				res.header("Content-Type", "text/csv; charset=utf-8");
				res.send(json.data);
				break;

			case 'json':
				res.header("Content-Type", "text/json; charset=utf-8");
				res.send(json.data);
				break;

			default:
				res.send(result.toJSON());
				break;
		}
	}
	else {
		res.send(result);
	}
};

Receptor.prototype.api = function(msg, tag) {
	var rs = this.ctrl[tag].exec(msg);
	return rs;
};

module.exports = Receptor;