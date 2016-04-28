const ParentBot = require('./_Bot.js');
const util = require('util');
const httpProxy = require('http-proxy');
const path = require('path');
const fs = require('fs');
const textype = require('textype');

var pathCert = path.join(__dirname, '../config/cert.pfx'),
		pathPw = path.join(__dirname, '../config/pw.txt'),
		logger;

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  var self = this;
  var opt = {};
	Bot.super_.prototype.init.call(this, config);
	logger = config.logger;
	this.serverPort = [5680, 80];
	this.httpsPort = [7843, 443];

	this.proxy = httpProxy.createProxyServer({});
	this.proxy.on('proxyReq', function(proxyReq, req, res, options) {
		var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress || '0.0.0.0';
	  proxyReq.setHeader('x-forwarded-for', ip);
	});
	this.proxy.on('error', function (err, req, res) {
		var rs = {result: -5, message: 'machine offline', data: {code: 3}};
		res.writeHead(500, {'Content-Type': 'application/json'});
		res.write(JSON.stringify(rs));
		res.end();
	});

	this.http = require('http').createServer(function (req, res) { self.forward(req, res); });
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
		}, function (req, res) { self.forward(req, res); });
		this.https.on('error', function(err) {
			if(err.syscall == 'listen') {
				var nextPort = self.httpsPort.pop() || self.listeningHttps + 1;
				self.startServer(null, nextPort);
			}
			else {
				throw err;
			}
		});

		this.https.on('listening', function() {
			config.listeningHttps = self.listeningHttps;
		});
	}
};

Bot.prototype.loadDomain = function () {

};

Bot.prototype.start = function (cb) {
  Bot.super_.prototype.start.apply(this);
	var self = this;
	var httpPort = self.serverPort.pop();
	var httpsPort = self.httpsPort.pop();
	this.startServer(httpPort, httpsPort, cb);
};

Bot.prototype.startServer = function(port, httpsPort, cb) {
  if(port > 0) {
		this.listening = port;
		this.http.listen(port, function() {
				if(typeof(cb) == 'function') { cb(); }
		});
	}

	if(httpsPort > 0 && this.pfx) {
		this.listeningHttps = httpsPort;
		this.https.listen(httpsPort, function() {});
	}
};

Bot.prototype.forward = function (req, res) {
	var self = this;
	var host = req.headers.host;
	var subdomain = host.split(".").length > 2? host.match(/^[a-zA-Z0-9]+\./): null;
	if(subdomain != null) { subdomain = subdomain[0].substr(0, subdomain[0].length - 1); }
	var bot = this.getBot('Receptor');
	var port = bot.listening || 5566;
	var options = {};
	options.target = 'http://127.0.0.1:' + port;
	if(textype.isPublicIP(host) || subdomain === null) {
		this.proxy.web(req, res, options);
	}
	else if(/^\/test\/$/.test(req.url)) {
		var tracker = this.getBot('Tracker');
		var opt = {domain: subdomain};
		tracker.proxy(opt, test, function (e, nodeurl) {
			var rs = {result: 0, message: "", data: {}};
			if(e) {
				rs.result = -5;
				rs.message = e.message;
				rs.data = {code: e.code};
				res.write(JSON.stringify(rs));
				res.end();
				return;
			}
			else {
				rs.result = 1;
				rs.message = "node is working";
				res.write(JSON.stringify(rs));
				res.end();
				return;
			}
		});
	}
	else {
		var tracker = this.getBot('Tracker');
		var opt = {domain: subdomain};
		tracker.proxy(opt, false, function (e, nodeurl) {
			if(e) {
				var rs = {
					result: -5,
					message: e.message,
					data: {code: e.code}
				};
				res.write(JSON.stringify(rs));
				res.end();
				return;
			}
			else {
				options.target = nodeurl;
				self.proxy.web(req, res, options);
			}
		});
	}
};

module.exports = Bot;
