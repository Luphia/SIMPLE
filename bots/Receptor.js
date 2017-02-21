const log4js = require('log4js');
const express = require('express');
const Session = require('express-session');
const favicon = require('serve-favicon');
const os = require('os');
const exec = require('child_process').exec;
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const url = require('url');
const bodyParser = require('body-parser');
const multer = require('multer');
const http = require('http');
const https = require('https');
const echashcash = require('echashcash');
const ecresult = require('ecresult');
const dvalue = require('dvalue');
const textype = require('textype');

const Parent = require(path.join(__dirname, '_Bot.js'));

const request = require('ecrequest').request;

const hashcashLevel = 3;
const allowDelay = 10000 * 1000;

var i18n, logger, db, checkLogin, checkHashCash, errorHandler, returnData;
checkLogin = function (req, res, next) {
	if(req.session.uid === undefined) {
		res.result.setErrorCode('10201');
		res.result.setMessage('User Not Authorized');
		returnData(req, res, next)
	}
	else {
		next();
	}
};
checkHashCash = function (req, res, next) {
	var invalidHashcash = function () {
		//-- for test
		var t, h = req.headers.hashcash, nt = new Date().getTime();
		if(h) { t = parseInt(h.split(":")[0]) || nt; }
		var c = [req.url, nt, ""].join(":");
		var hc = echashcash(c);
		var d = {
			hashcash: req.headers.hashcash,
			sample: [nt, hc].join(":")
		};
		if(new Date().getTime() - t > allowDelay) { d.information = "timeout"; }
		if(new Date().getTime() < t) { d.information = "future time"; }

		res.result.setErrorCode('10101');
		res.result.setMessage('Invalid Hashcash');
		res.result.setData(d);  //-- for test
		returnData(req, res, next);
	};

	var hashcash = req.headers.hashcash;
	if(!hashcash) { return invalidHashcash(); }
	var cashdata = hashcash.split(":");
	cashdata = cashdata.map(function (v) { return parseInt(v) || 0; });
	var content = [req.url, cashdata[0], ""].join(":");
	var now = new Date().getTime();
	var check = now - cashdata[0] < allowDelay? echashcash.check(content, cashdata[1], hashcashLevel): false;
	if(check) {
		next();
	}
	else { return invalidHashcash(); }
};
errorHandler = function (err, req, res, next) {
	logger.exception.error(err);
	if(!res.finished) {
		try {
			res.statusCode = 500;
			res.result.setMessage('oops, something wrong...');
			res.send(res.result.response());
		}
		catch(e) {}
	}
};
returnData = function(req, res, next) {
	var session, json, isFile, isURL;

	if(!res.finished) {
		json = res.result.response();
		isFile = new RegExp("^[a-zA-Z0-9\-]+/[a-zA-Z0-9\-\.]+$").test(json.message);
		isURL = textype.isURL(json.message);
		if(res.result.isDone()) {
			session = res.result.getSession();

			for(var key in session) {
				if(session[key] === null) {
					delete req.session[key];
				}
				else {
					req.session[key] = session[key];
				}
			}
		}
		else {
			res.status(404);
			res.result.setMessage("Invalid operation");
		}

		if(isFile) {
			res.header('Content-Type', json.message);
			res.end(json.data);
		}
		else if(isURL) {
			var crawler;
			var options = url.parse(json.message);
			options.method = 'GET';
			switch(options.protocol) {
				case 'http:':
					crawler = http;
					break;
				case 'https:':
				default:
					crawler = https;
					options.rejectUnauthorized = false;
			}
			crawler.request(options, function (cRes) {
				res.header('Content-Type', cRes.headers['content-type']);
				cRes.pipe(res);
			}).on('error', function (e) { res.end(); }).end();
		}
		else if(json.result >= 100) {
			res.status(json.result);
			for(var key in json.data) {
				res.header(key, json.data[key]);
			}

			res.end();
		}
		else {
			res.header("Content-Type", 'application/json');
			res.send(json);
		}
	}
	else {
		// timeout request
		json = res.result.response();
		res.result.resetResponse();
	}
	if(json.errorcode) {
		logger.exception.warn('----- request -----');
		logger.exception.warn(req.method, req.url);
		logger.exception.warn('session:', req.headers);
		logger.exception.warn('session:', req.session);
		logger.exception.warn('params:', req.params);
		logger.exception.warn('query:', req.query);
		logger.exception.warn('body:', req.body);
		logger.exception.warn('-------------------');
	}

	var rs = json.errorcode? [json.result, json.errorcode].join(':'): json.result;
	var ev = req.url.split('/')[1];
	var event = {
		"session": req.sessionID,
		"user": req.session.uid || '?',
		"event": req.method + ' ' + ev,
		"success": !!json.result,
		"error": json.errorcode,
		"data": json.data
	};
	logger.info(req.method, req.url, rs, req.session.ip, json.cost);
};

var Bot = class extends Parent {
	constructor() {
		super();
		this.name = path.parse(__filename).base.replace(/.js$/, '');
		this.router = express.Router();
		this.app = express();
	}

	set tokenParser(value) {
		this._tokenParser = value;
	}

	init(config) {
		return super.init(config).then(v => {
			logger = this.logger;
			db = this.db;
			i18n = this.i18n;

			// initial token parser
			this._tokenParser = (req, res, next) => { next(); };

			// listen port
			this.listen = {http: config.main.http, https: config.main.https};
			this.testPorts = {http: [5566, config.http], https: [7788, config.https]};

			// http & https
			this.http = require('http').createServer(this.app);
			this.https = require('spdy').createServer(config.cert, this.app);

			// session
			this.session = Session({
				secret: config.main.session,
				resave: true,
				saveUninitialized: true
			});

			// session
			this.app.use(this.session);
			// preprocess
			this.app.use((req, res, next) => { this.filter(req, res, next); });
			// static file
			this.app.use(express.static(path.join(__dirname, '../public')));
			this.app.use('/resources/', express.static(path.join(__dirname, '../resources')));
			// form-data parser
			this.app.use(bodyParser.urlencoded({ extended: false }));
			// json parser
			this.app.use(bodyParser.json({}));
			// file parser
			this.app.use(multer({ dest: config.path.upload }).any());

			this.app.use(this.router);
			this.app.use(returnData);

			this.register({method: 'get'}, '/', (options) => {
				return Promise.resolve(config.package);
			});

			return Promise.resolve(v);
		});
	}
	start() {
		return super.start().then(() => {
			return this.startHttp();
		}).then(() => {
			return this.startHttps();
		});
	}
	ready() {
		return super.ready().then(v => {
			return Promise.resolve(v);
		});
	}

	startHttp(retry) {
		this.http.once('error', e => {
			if(e.syscall == 'listen') {
				this.listen.http = this.testPorts.http.pop() || this.listen.http + 1;
				this.startHttp(true);
			}
			else {
				// unknown error
				logger.exception.warn(e);
				throw e;
			}
		});
		return new Promise((resolve, reject) => {
			var listener = () => {
				logger.info('HTTP:', this.listen.http);
				resolve();
			};
			if(!retry) { this.http.on('listening', listener); }
			this.http.listen(this.listen.http, () => {});
		});
	}
	startHttps(retry) {
		this.https.once('error', e => {
			if(e.syscall == 'listen') {
				this.listen.https = this.testPorts.https.pop() || this.listen.https + 1;
				this.startHttps(true);
			}
			else {
				// unknown error
				logger.exception.warn(e);
				throw e;
			}
		});
		return new Promise((resolve, reject) => {
			var listener = () => {
				logger.info('HTTPS:', this.listen.https);
				resolve();
			};
			if(!retry) { this.https.on('listening', listener); }
			this.https.listen(this.listen.https, () => {
				resolve();
			});
		});
	}
	filter(req, res, next) {
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '0.0.0.0';
		var port = req.connection.remotePort;
		var parseIP = ip.match(/\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/);
		ip = !!parseIP? parseIP[0]: ip;
		if(!req.session.ip) { req.session.ip = ip; }
		if(!req.session.port) { req.session.port = port; }
		var powerby = this.config.powerby;

		var processLanguage = function (acceptLanguage) {
			var regex = /((([a-zA-Z]+(-[a-zA-Z]+)?)|\*)(;q=[0-1](\.[0-9]+)?)?)*/g;
			var l = acceptLanguage.toLowerCase().replace(/_+/g, '-');
			var la = l.match(regex);
			la = la.filter(function (v) {return v;}).map(function (v) {
				var bits = v.split(';');
				var quality = bits[1]? parseFloat(bits[1].split("=")[1]): 1.0;
				return {locale: bits[0], quality: quality};
			}).sort(function (a, b) { return b.quality > a.quality; });
			return la;
		};
		req.language = processLanguage(req.headers['accept-language'] || 'en-US');
		i18n.setLocale(req.language[0].locale.toLowerCase());

		res.result = new ecresult();
		res.header('X-Powered-By', powerby);
		res.header('Client-IP', ip);
		res.header("Access-Control-Allow-Origin", "*");
		res.header("Access-Control-Allow-Methods", "GET, PUT, POST, DELETE, OPTIONS");
		res.header("Access-Control-Allow-Headers", "Hashcash, Authorization, Content-Type");

		// parse token
		this._tokenParser(req, res, next);
	}
	// options: method, authorization, hashcash
	register() {
		var params = Array.prototype.slice.call(arguments);
		var options = params.splice(0, 1)[0];
		var method = (options.method || 'get').toLowerCase();
		var authorization = !!options.authorization;
		var hashcash = !!options.hashcash;
		var registerPath = params[0];
		var executeProcess = params[1];
		this.router[method](registerPath, (req, res, next) => {
			let options = {
				url: req.url,
				params: req.params,
				query: req.query,
				body: req.body,
				files: req.files,
				session: req.session,
			};
			executeProcess(options).then((d) => {
				res.result.setResult(1);
				if(Array.isArray(d)) {
					res.result.setData(d);
				}
				else if(typeof(d) == 'object') {
					var data = {};
					var session = {};
					for(var k in d) {
						// session data
						if(/^_session_/.test(k)) {
							let key = k.substr(9);
							session[key] = d[k];
						}
						else {
							data[k] = d[k];
						}
					}

					res.result.setData(data);
					res.result.setSession(session);
				}
				else {
					res.result.setData(d);
				}
				next();
			}).catch(e => {
				res.result.setError(e);
				next();
			});
		});
	}
};

module.exports = Bot;