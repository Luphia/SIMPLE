#!/usr/bin/env node
const os = require('os');
const fs = require('fs');
const path = require('path');
const log4js = require('log4js');
const dvalue = require('dvalue');
const packageInfo = require('../package.json');
const simpleConfig = require('../config/');

var mongodb = require('mongodb').MongoClient;
var UUID, config, folders;

// initial folder
var homepath = path.join(process.env.HOME || process.env.USERPROFILE, packageInfo.name);
var upload = path.join(homepath, "uploads/");
var logs = path.join(homepath, "logs/");
var dataset = path.join(homepath, "dataset/");
var tmp = path.join(homepath, "tmp/");
folders = {
  home: homepath,
  upload: upload,
  logs: logs,
  dataset: dataset,
  tmp: tmp
};
if (!fs.existsSync(homepath)) { fs.mkdirSync(homepath); }
if (!fs.existsSync(upload)) { fs.mkdirSync(upload); }
if (!fs.existsSync(logs)) { fs.mkdirSync(logs); }
if (!fs.existsSync(tmp)) { fs.mkdirSync(tmp); }

// initial logger
var infoPath = path.join(logs, 'info.log');
var exceptionPath = path.join(logs, 'exception.log');
var threatPath = path.join(logs, 'threat.log');
log4js.configure({
  "appenders": [
    { "type": "console" },
    { "type": "file", "filename": infoPath, "category": "info", "maxLogSize": 10485760, "backups": 365 },
    { "type": "file", "filename": exceptionPath, "category": "exception", "maxLogSize": 10485760, "backups": 10 },
    { "type": "file", "filename": threatPath, "category": "threat", "maxLogSize": 10485760, "backups": 10 }
  ],
  "replaceConsole": true
});
var logger = {
  info: log4js.getLogger('info'),
  exception: log4js.getLogger('exception'),
  threat: log4js.getLogger('threat')
};

// check is open?
var pathPID = path.join(homepath, 'PID');
var oldPID;

try {
  oldPID = parseInt(fs.readFileSync(pathPID));
  if(process.kill(oldPID, 0)) {
    process.exit();
  }
}
catch(e) {

}

// create PID file
var PID = process.pid;
fs.writeFile(pathPID, PID, function(err) {});

// load config
config = {
  UUID: UUID,
  path: folders,
  logger: logger,
  package: {
    name: packageInfo.name,
    version: packageInfo.version
  },
  powerby: packageInfo.name + " v" + packageInfo.version
};

var connectDB = function (options, cb) {
  options = dvalue.default(options, {});
  switch (options.type) {
    case 'mongodb':
      var path = options.path;
      mongodb.connect(path, cb);
      break;
    default:
      var DB = require('tingodb')().Db;
      db = new DB(dataset, {});
      cb(null, db);
  }
};

// start all bot
var botFolder = path.join(__dirname, "../bots");
var files = fs.readdirSync(botFolder);
var bots = [];
var getBot = function (name) {
  var rs;
  for(var i in bots) {
    if(bots[i].name.toLowerCase() == name.toLowerCase()) { return bots[i]; }
  }
};
var startBot = function () {
  connectDB(simpleConfig.db, function (e, db) {
    var sub = "js";
    var reg = new RegExp('\.' + sub + '$');
    for(var key in files) {
      if(reg.test(files[key]) && files[key].indexOf("_") == -1) {
        var Bot = require(path.join(botFolder, files[key]));
        var bot = new Bot(config);
        bots.push(bot);
        bot.name = files[key].split('.' + sub)[0];
        bot.db = db;
        bot.getBot = getBot;
      }
    }

    bots.map(function (b) {
      b.start();
    });
  });
};
startBot();
