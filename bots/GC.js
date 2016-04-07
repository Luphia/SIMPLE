const ParentBot = require('./_Bot.js');
const util = require('util');
const fs = require('fs');
const path = require('path');
const mongodb = require('mongodb');
const raid2x = require('raid2x');
const dvalue = require('dvalue');

var expire = 86400000 * 7;
var logger;

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  Bot.super_.prototype.init.call(this, config);
  var folders = config.path || {};
  logger = config.logger;
	this.uploadPath = folders.upload || "./uploads/";
  this.filePath = path.join(folders.home, 'files');
  this.thumbnailPath = path.join(folders.home, 'thumbnails');
};

Bot.prototype.start = function () {
  var self = this;
  setTimeout(function () {
    self.gc();
  }, 1000);
};

Bot.prototype.gc = function () {
  this.removeUploads();
  this.removeFiles();
};

Bot.prototype.removeUploads = function () {
  var self = this;
  var etime = new Date().getTime() - expire;
  fs.readdir(this.uploadPath, function (e, list) {
    if(!Array.isArray(list)) { return; }
    list.map(function (v) {
      var p = path.join(self.uploadPath, v);
      fs.lstat(p, function (e, stat) {
        var atime = stat.atime.getTime();
        var mtime = stat.mtime.getTime();
        if(atime > mtime && atime < etime) {
          fs.unlink(p, function () {});
          logger.info.info('rm upload', p);
        }
      })
    });
  });
};

Bot.prototype.removeFiles = function (uid) {
  var self = this;
  if(!uid) {
    var cname = 'Users';
    var collection = this.db.collection(cname);
    collection.find({}, {_id: 1}).toArray(function (e, d) {
      d.map(function (v) {
        if(v._id) { self.removeFiles(v._id.toString()); }
      });
    });
    return;
  }
  var etime = new Date().getTime() - expire;
  var cname = [uid, 'files'].join('_');
  var dir = path.join(this.filePath, uid);
  var collection = self.db.collection(cname);
  var findQuery = {destroy: {$lt: etime}};
  collection.find(findQuery, {_id: 1, destroy: 1}).toArray(function (e, d) {
    if(!Array.isArray(d)) { return; }
    d.map(function(v) {
      var p = path.join(dir, v._id.toString());
      fs.unlink(p, function () {});
      logger.info.info('destroy', p);
    });
    collection.remove(findQuery, function () {});
  });
};

module.exports = Bot;
