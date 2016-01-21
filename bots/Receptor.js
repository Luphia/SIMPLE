const ParentBot = require('./_Bot.js');
const util = require('util');
const log4js = require('log4js');
const express = require('express');
const Session = require('express-session');
const favicon = require('serve-favicon');
const os = require('os');
const exec = require('child_process').exec;
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const bodyParser = require('body-parser');
const multer  = require('multer');
const http = require('http');
const Result = require('../classes/Result.js');

var pathCert = path.join(__dirname, '../config/cert.pfx'),
		pathPw = path.join(__dirname, '../config/pw.txt'),
		logger;

var cleanDir = function(dirPath, removeSelf) {
	try { var files = fs.readdirSync(dirPath); }
	catch(e) { return; }
	if (files.length > 0) {
		for (var i = 0; i < files.length; i++) {
			var filePath = path.join(dirPath, files[i]);
			if (fs.statSync(filePath).isFile()) {
				fs.unlinkSync(filePath);
			}
			else {
				cleanDir(filePath, true);
			}
		}
	}
	if(removeSelf) {
		fs.rmdirSync(dirPath);
	}
};

var Bot = function(config) {
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function(config) {
	var self = this;
	Bot.super_.prototype.init.call(this, config);
	var self = this;
	this.serverPort = [5566, 80];
	this.httpsPort = [7788, 443];
	this.nodes = [];
	this.monitorData = {};
	this.monitorData.traffic = {in: 0, out: 0};
	logger = config.logger;

	var folders = config.path || {};
	var upload = folders.upload || "./uploads/";
	var shards = folders.shards || "./shards/";
	this.shardPath = shards;
	var logs = folders.logs || "./logs/";

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
		config.listening = self.listening;
	});

	// if has pxf -> create https service
	if(fs.existsSync(pathCert)) {
		this.pfx = fs.readFileSync(pathCert);
		this.pfxpw = fs.readFileSync(pathPw);

		this.https = require('https').createServer({
			pfx: this.pfx,
			passphrase: this.pfxpw
		}, this.app);
		this.https.on('error', function(err) {
			if(err.syscall == 'listen') {
				var nextPort = self.httpsPort.pop() || self.listeningHttps + 1;
				self.startServer(nextPort);
			}
			else {
				throw err;
			}
		});

		this.https.on('listening', function() {
			config.listeningHttps = self.listeningHttps;
		});
	}

	this.session = Session({
		secret: this.randomID(),
		resave: true,
		saveUninitialized: true
	});

	this.app.set('port', this.serverPort.pop());
	this.app.set('portHttps', this.httpsPort.pop());
	this.app.use(this.session);
	this.app.use(bodyParser.urlencoded({ extended: false }));
	this.app.use(bodyParser.json({limit: '10mb'}));
	this.app.use(function(req, res, next) { self.filter(req, res, next); });
	this.app.use('/shard', express.static(shards));
	this.app.use(this.router);
	this.app.use(this.returnData);
	this.ctrl = [];

	this.router.get('/version/', function(req, res, next) {
		var result = new Result();
		result.setResult(1);
		result.setMessage('Application info');
		result.setData(self.config.package);
		res.result = result;
		next();
	});

	this.router.post('/shard/:hash', multer({ dest: self.config.path.upload }).single('shard'), function(req, res, next) {
		var result = new Result();
		var rs = 0;
		var toChecked = 0

		var hash = req.params.hash;
		var oldname = req.file.path;
		var newname = path.join(self.shardPath, hash);

		var s = fs.ReadStream(oldname);
		var shasum = crypto.createHash('sha1');
		s.on('data', function(d) {
			shasum.update(d);
		});
		s.on('error', function() {
			result.setMessage("something wrong with: " + oldname);
				s.close();
				res.result = result;
				next();
				// End of Process
		});
		s.on('end', function() {
			var d = shasum.digest('hex');

			if(hash.indexOf(d) == 0) {
				var source = fs.createReadStream(oldname);
				// if file exists, drop it
				if(!fs.existsSync(newname)) {
					var dest = fs.createWriteStream(newname);
					source.pipe(dest);
					source.on('end', function() {
						fs.unlink(oldname, function() {});
						fs.lstat(newname, function(err, data) {
							if(!err) {
								var size = data.size || 0;
								self.spaceUsage += size;
							}
						});
						source.close();
						dest.close();
					});
				}
				else {
					fs.unlink(oldname, function() {});
				}

				result.setResult(1);
				result.setData({});

				res.result = result;
				next();
			}
			else {
				fs.unlink(oldname, function() {});
				result.setData({
					path: hash,
					hash: d,
					file: oldname
				});

				res.result = result;
				next();
			}
		});
	});
};

Bot.prototype.reset = function() {
	logger.info.info('--- Reset ---');
	cleanDir(this.config.path.shards);
	cleanDir(this.config.path.upload);
	cleanDir(this.config.path.dataset);

	for(var k in this.ctrl) {
		this.ctrl[k].reset();
	}
};

Bot.prototype.start = function(cb) {
	Bot.super_.prototype.start.apply(this);
	var self = this;
	var httpPort = this.app.get('port');
	var httpsPort = this.app.get('portHttps');
	this.router.use(this.errorHandler);
	this.startServer(httpPort, httpsPort, cb);
};

Bot.prototype.startServer = function(port, httpsPort, cb) {
	this.listening = port;
	this.listeningHttps = httpsPort;
	this.http.listen(port, function() {
			if(typeof(cb) == 'function') { cb(); }
	});

	if(this.pfx) {
		this.https.listen(httpsPort, function() {});
	}
}

Bot.prototype.stop = function() {
	Bot.super_.prototype.stop.apply(this);
	this.http.close();

	if(this.pfx) {
		this.https.close();
	}
};

Bot.prototype.filter = function(req, res, next) {
	var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '0.0.0.0';
	var port = req.connection.remotePort;
	parseIP = ip.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
	ip = !!parseIP? parseIP[0]: ip;
	if(!req.session.ip) { req.session.ip = ip; }
	if(!req.session.port) { req.session.port = port; }
	var powerby = this.config.powerby;
	res.header('X-Powered-By', powerby);
	res.header('Client-ID', this.config.UUID);
  res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
	next();
};

Bot.prototype.errorHandler = function (err, req, res, next) {
	logger.exception.error(err);
	res.statusCode = 500;
	res.json({result: 0, message: 'oops, something wrong...'});
};

Bot.prototype.returnData = function(req, res, next) {
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
		res.status(404);
		result = new Result();
		result.setMessage("Invalid operation");
	}

	if(typeof(result.toJSON) == 'function') {
		var json = result.toJSON();
		var isFile = new RegExp("^[a-zA-Z0-9\-]+/[a-zA-Z0-9\-]+$").test(json.message);

		if(isFile) {
			res.header("Content-Type", json.message);
			res.send(json.data);
		}
		else if(json.result >= 100) {
			res.status(json.result);
			for(var key in json.data) {
				res.header(key, json.data[key]);
			}

			res.end();
		}
		else {
			res.send(json);
		}
	}
	else {
		res.send(result);
	}
};

module.exports = Bot;
