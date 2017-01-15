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

var logger, db, checkLogin, checkHashCash, errorHandler, returnData;
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
				cRes.on('data', function (chunk) {
					res.write(chunk);
				});
				cRes.on('end', function () {
					res.end();
				})
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
	init(config) {
		return super.init(config).then(v => {
			logger = this.logger;
			db = this.db;
			this.http = require('http').createServer(this.app);
			this.https = require('spdy').createServer(config.cert, this.app);
			return Promise.resolve(v);
		});
	}
	start() {
		return super.start().then(v => {
			return new Promise((resolve, reject) => {
				this.http.listen(5566, function() {
					console.log('http listen', 5566);
					resolve();
				});
			});
		}).then(v => {
			return new Promise((resolve, reject) => {
				this.https.listen(7788, function() {
					console.log('https listen', 7788);
					resolve();
				});
			});
		});
	}
};

module.exports = Bot;