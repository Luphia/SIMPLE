const ParentBot = require('./_Bot.js');
const util = require('util');
const fs = require('fs');
const path = require('path');
const mongodb = require('mongodb');
const raid2x = require('raid2x');
const dvalue = require('dvalue');

var maxThumbnailSize = 20 * 1024;

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  Bot.super_.prototype.init.call(this, config);
  this.filePath = path.join(config.path.home, 'files');
  this.thumbnailPath = path.join(config.path.home, 'thumbnails');
  this.mkdir(this.filePath, function () {});
  this.mkdir(this.thumbnailPath, function () {});
};

Bot.prototype.start = function () {

};
/* require: file, file.uid */
/* 1: file not found, 2: run out of space */
Bot.prototype.addFile = function (file, cb) {
  var self = this;
  var filepath = dvalue.default(file.path, '');
  fs.stat(filepath, function (e, d) {
    if(e) {
      e.code = 1;
      e.message = 'file not found';
      return cb(e);
    }
    /* add to db */
    var f = new raid2x(file.path);
    var uid = dvalue.default(file.uid, 'default');
    var cname = [uid, 'files'].join('_');
    var collection = self.db.collection(cname);
    var meta = f.getMeta(true, false);
    meta.name = file.originalname
    meta.mimetype = file.mimetype;
		if(file.custom) {
			for(var k in file.custom) {
				try { file.custom[k] = JSON.parse(file.custom[k]); } catch(e) {}
			}
			meta.custom = file.custom;
		}
    meta.ctime = new Date().getTime();
    collection.insertOne(meta, {}, function (e1, d1) {
      if(e1) { return cb(e1); }
      var fid = meta._id.toString();
      meta.fid = fid;
      delete meta._id;
      cb(null, meta);
      /* move file */

      var destination = path.join(self.filePath, uid, fid);
      self.moveFile(filepath, destination, function () {});
    });
  });
};

Bot.prototype.addThumbnail = function (file, cb) {
  var self = this;
  var filepath = dvalue.default(file.path, '');
  if(file.size > maxThumbnailSize) {
    var size = dvalue.displayByte(maxThumbnailSize);
    var e = new Error("thumbnail file size exceeded: " + size.join(""));
    e.code = 2;
    cb(e);
  }
  fs.stat(filepath, function (e, d) {
    if(e) {
      e.code = 1;
      e.message = 'file not found';
      return cb(e);
    }
    /* search file */
    var uid = dvalue.default(file.uid, 'default');
    var fid = file.fid;
    file.uid = uid;
    self.getMetadata(file, function (e, d) {
      if(e) { return cb(e); }
      var destination = path.join(self.thumbnailPath, uid, fid);
      self.moveFile(filepath, destination, function (e1) {
        if(e1) { return cb(e1); }
        return cb(null, {fid: fid});
      });
    });
  });
};

Bot.prototype.getMetadata = function (file, cb) {
  var uid = dvalue.default(file.uid, 'default');
  var fid = '';
  var cname = [uid, 'files'].join('_');
  var collection = this.db.collection(cname);
	try { fid = new mongodb.ObjectID(file.fid); } catch(e) {}
  collection.findOne({_id: fid, destroy: {$exists: false}}, {}, function (e, d) {
    if(e) { return cb(e); }
    if(!d) {
      e = new Error("file not found: " + file.fid);
      e.code = 1;
      return cb(e);
    }
    delete d._id;
    d.fid = file.fid;
    return cb(null, d);
  });
};

Bot.prototype.listFile = function (uid, cb) {
  var uid = dvalue.default(uid, 'default');
  var cname = [uid, 'files'].join('_');
  var collection = this.db.collection(cname);
  collection.find({destroy: {$exists: false}}, {_id: 1, name: 1, size: 1, hash: 1, mimetype: 1, custom: 1}).toArray(function (e, d) {
    if(e) { return cb(e); }
    var list = d.map(function (v) {
      v.fid = v._id;
      delete v._id;
      return v;
    });
    cb(null, list);
  });
};

Bot.prototype.getFile = function (file, cb) {
  var uid = dvalue.default(file.uid, 'default');
  var fid = file.fid;
  var filepath = path.join(this.filePath, uid, fid);
  var cname = [uid, 'files'].join('_');
  var collection = this.db.collection(cname);
  this.getMetadata(file, function (e, meta) {
    if(e) { return cb(e); }
    fs.readFile(filepath, function (e1, buffer) {
      if(e) { return cb(e1); }
      buffer.mimetype = meta.mimetype;
      cb(null, buffer);
    });
  });
};

Bot.prototype.getThumbnail = function (file, cb) {
  var uid = dvalue.default(file.uid, 'default');
  var fid = file.fid;
  var filepath = path.join(this.thumbnailPath, uid, fid);
  fs.readFile(filepath, function (e, buffer) {
    if(e) { return cb(e); }
    buffer.mimetype = 'image/jpeg';
    cb(null, buffer);
  });
};

Bot.prototype.mkdir = function (dir, cb) {
  var self = this;
  fs.stat(dir, function (e, d) {
    if(!d) {
      var parent = path.parse(dir).dir;
      self.mkdir(parent, function (e, d) {
        if(e) { return cb(e); }
        fs.mkdir(dir, cb);
      });
    }
    else { return cb(null); }
  });
};

Bot.prototype.moveFile = function (source, destination, cb) {
  var dir = path.parse(destination).dir;
  this.mkdir(dir, function (e, d) {
    if(e) { return cb(e); }
    fs.rename(source, destination, cb);
  });
};

module.exports = Bot;
