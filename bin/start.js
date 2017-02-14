#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const url = require('url');
const path = require('path');
const pem = require('pem');
const log4js = require('log4js');
const i18n = require("i18n");
const dvalue = require('dvalue');
const mongodb = require('mongodb').MongoClient;

var packageInfo = require('../package.json');

var initialFolder = function (options) {
	var folderArray = [];
	var projectName = options.name;
	var homePath = path.join(process.env.HOME || process.env.USERPROFILE, projectName);
	var configPath = path.join(homePath, "config/");
	var uploadPath = path.join(homePath, "uploads/");
	var logPath = path.join(homePath, "logs/");
	var datasetPath = path.join(homePath, "dataset/");
	var tmpPath = path.join(homePath, "tmp/");
	var pathPID = path.join(homePath, "PID");
	var pathUUID = path.join(homePath, "UUID");
	var UUID = dvalue.guid();

	var createFolder = function (folder) {
		return new Promise((resolve, reject) => {
			fs.exists(folder, function (rs) {
				if(!rs) {
					fs.mkdir(folder, function (e, d) {
						if(e) { reject(e); }
						else { resolve(folder); }
					});
				}
				else {
					resolve(folder);
				}
			});
		});
	};

	var createPID = function (v) {
		new Promise((resolve, reject) => {
			var PID = process.pid;
			fs.writeFile(pathPID, PID, function(e) {
				if(e) { reject(e); }
				else { resolve(v); }
			});
		});
	};
	var createUUID = function (homepath) {
		if(!fs.existsSync(pathUUID)) {
			fs.writeFile(pathUUID, UUID, function(err) {});
		}
		else {
			UUID = fs.readFileSync(pathUUID).toString();
		}
		return Promise.resolve();
	};

	folderArray.push(
		{key: 'config', path: configPath},
		{key: 'upload', path: uploadPath},
		{key: 'log', path: logPath},
		{key: 'dataset', path: datasetPath},
		{key: 'tmp', path: tmpPath}
	);
	return folderArray.reduce((pre, curr) => {
		return pre.then(res => {
			res = !!res? res: { UUID: UUID, path: { home: homePath }};
			return createFolder(curr.path).then(nextRes => {
				res.path[curr.key] = curr.path
				return res;
			});
		});
	}, createFolder(homePath).then(createPID).then(createUUID));
};

var initialConfig = function (config) {
	// read package.json
	config.package = {
		name: packageInfo.name,
		version: packageInfo.version
	};
	config.powerby = packageInfo.name + " v" + packageInfo.version;

	var defaultConfigFolder = path.join(__dirname, '../config');
	var customConfigFolder = config.path.config;

	return new Promise((resolve, reject) => {
		// load certification
		var certFiles = [path.join(defaultConfigFolder, 'certification', 'cert.pem'), path.join(defaultConfigFolder, 'certification', 'key.pem')];
		var certFilesExists;
		try { certFilesExists = !certFiles.find(function (v) { return !(fs.lstatSync(v).size > 64); }); } catch(e) {}
		if(certFilesExists) {
			config.cert = {
				cert: fs.readFileSync(certFiles[0]),
				key: fs.readFileSync(certFiles[1])
			};
			resolve(config);
		}
		else {
			pem.createCertificate({days: 365, selfSigned: true}, function(e, d) {
				config.cert = {
					cert: d.certificate,
					key: d.serviceKey
				};
				resolve(config);
			});
		}
	}).then(d => {
		// read default config
		const token = ['^default.', '.config$'];
		const ext = '.config';
		fs.readdirSync(defaultConfigFolder).map(function (file) {
			if(token.find(function (v) { return !new RegExp(v).test(file) })) { return; }
			var tag = file.substr(token[0].length - 1, file.length - token.reduce(function (prev, curr) { return prev + curr.length - 1; }, 0));
			var defaultConfigFilePath = path.join(defaultConfigFolder, file);
			var customConfigFilePath = path.join(customConfigFolder, tag + ext);

			// read default config
			var defaultConfigFile = fs.readFileSync(defaultConfigFilePath);
			var defaultConfig = JSON.parse(defaultConfigFile);

			// read custom config
			var customConfig = defaultConfig;
			if(fs.existsSync(customConfigFilePath)) {
				customConfig = JSON.parse(fs.readFileSync(customConfigFilePath));
			}
			else {
				fs.writeFile(customConfigFilePath, defaultConfigFile, e => {});
			}
			config[tag] = dvalue.default(customConfig, defaultConfig);
		});
		
		return Promise.resolve(config);
	});
};

var initialTranslator = function (config) {
	var localeFolder = path.join(__dirname, '../locales');
	i18n.configure({
		locales: ['en', 'zh', 'zh-tw', 'zh-cn'],
		directory: localeFolder
	});
	config._i18n = i18n;
	return Promise.resolve(config);
};

var initialLogger = function (config) {
	var logFolder = config.path.log;
	var infoPath = path.join(logFolder, 'info.log');
	var exceptionPath = path.join(logFolder, 'exception.log');
	var threatPath = path.join(logFolder, 'threat.log');
	log4js.configure({
		"appenders": [
			{ "type": "console" },
			{ "type": "file", "filename": infoPath, "category": "info", "maxLogSize": 10485760, "backups": 365 },
			{ "type": "file", "filename": exceptionPath, "category": "exception", "maxLogSize": 10485760, "backups": 10 },
			{ "type": "file", "filename": threatPath, "category": "threat", "maxLogSize": 10485760, "backups": 10 }
		],
		"replaceConsole": true
	});
	config._logger = {
		trace: function () {
			if(config.main.debug) {
				var currLogger = log4js.getLogger('info');
				currLogger.trace.apply(currLogger, Array.prototype.slice.call(arguments));
			} 
		},
		debug: function () {
			if(config.main.debug) {
				var currLogger = log4js.getLogger('info');
				currLogger.debug.apply(currLogger, Array.prototype.slice.call(arguments));
			}
		},
		info: function () {
			var currLogger = log4js.getLogger('info');
			currLogger.info.apply(currLogger, Array.prototype.slice.call(arguments));
		},
		warn: function () {
			var currLogger = log4js.getLogger('info');
			currLogger.warn.apply(currLogger, Array.prototype.slice.call(arguments));
		},
		error: function () {
			var currLogger = log4js.getLogger('info');
			currLogger.error.apply(currLogger, Array.prototype.slice.call(arguments));
		},
		fatal: function () {
			var currLogger = log4js.getLogger('info');
			currLogger.fatal.apply(currLogger, Array.prototype.slice.call(arguments));
		},
		exception: log4js.getLogger('exception'),
		threat: log4js.getLogger('threat')
	};
	return Promise.resolve(config);
};

var initialDB = function (config) {
	options = dvalue.default(config.db, {});
	return new Promise((resolve, reject) => {
		switch (options.type) {
			case 'mongodb':
				var path;
				if(options.user && options.password) {
					var tmpURL = url.parse(options.path);
					tmpURL.auth = dvalue.sprintf('%s:%s', options.user, options.password);
					path = url.format(tmpURL);
				}
				else {
					path = options.path;
				}
				mongodb.connect(path, function (e, d) {
					if(e) { reject(e); }
					else {
						config._db = d;
						resolve(config);
					}
				});
				break;
			default:
				var DB = require('tingodb')().Db;
				db = new DB(config.path.dataset, {});
				config._db = db;
				resolve(config);
		}
	});
};

var initialBot = function (config) {
	var botFolder = path.join(__dirname, "../bots");
	var sub = "js";
	var reg = new RegExp('\.' + sub + '$');
	var createBot = function (botPath) {
		var Bot = require(botPath);
		var bot = new Bot();
		return bot.init(config);
	}

	return new Promise((resolve, reject) => {
		fs.readdir(botFolder, function (e, d) {
			if(Array.isArray(d)) { resolve(d); }
			else { reject(e); }
		});
	}).then(function (d) {
		d = d.filter(function (v) {
			return reg.test(v) && v.indexOf("_") == -1;
		});
		return d.reduce((pre, curr) => {
			return pre.then(res => {
				var botPath = path.join(botFolder, curr);
				return createBot(botPath).then(nextRes => {
					res.push(nextRes);
					return res;
				});
			});
		}, Promise.resolve([]));
	});
};

var startService = function (Bots) {
	var start = function (bot) {
		return bot.start();
	};
	var ready = function (bot) {
		return bot.ready();
	};

	return Bots.reduce((pre, curr) => {
		return pre.then(res => {
			return start(curr).then(nextRes => {
				res.push(nextRes);
				return res;
			});
		});
	}, Promise.resolve([])).then((v) => {
		return Bots.reduce((pre, curr) => {
			return pre.then(res => {
				return ready(curr).then(nextRes => {
					res.push(nextRes);
					return res;
				});
			});
		}, Promise.resolve([]));
	});
};


// service start
initialFolder(packageInfo)
.then(initialConfig)
.then(initialTranslator)
.then(initialLogger)
.then(initialDB)
.then(initialBot)
.then(startService)
.catch(function (e) {
	console.error(e);
});