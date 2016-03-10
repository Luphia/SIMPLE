const ParentBot = require('./_Bot.js');
const util = require('util');
const path = require('path');
const mongodb = require('mongodb');
const dvalue = require('dvalue');

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
  Bot.super_.prototype.init.call(this, config);
};

Bot.prototype.start = function () {

};

/* require: tag, tag.uid */
Bot.prototype.createTag = function (tag, cb) {
	var uid = dvalue.default(tag.uid, 'default');
	var now = new Date().getTime();
	var cname = [uid, 'tags'].join('_');
	var collection = self.db.collection(cname);
	var newTag = {name: '', type: '', ctime: now};
	for(var k in tag) {
		if(k.indexOf('$') == 0) { continue; }
		newTag[k] = tag[k];
	}
	collection.insertOne(newTag, {}, function (e, d) {
		if(e) { return cb(e); }
		cb(null, meta);
	});
};

Bot.prototype.listTag = function (uid, cb) {
	uid = dvalue.default(uid, 'default');
  var cname = [uid, 'tags'].join('_');
  var collection = this.db.collection(cname);
  collection.find({destroy: {$exists: false}}).sort({"ctime": -1, _id: -1}).toArray(function (e, d) {
    if(e) { return cb(e); }
    cb(null, d);
  });
};

Bot.prototype.checkTagExists = function (uid, tags, cb) {
	if(Array.isArray(tags)) { tags = [tags]; }
	uid = dvalue.default(uid, 'default');
	var result = [];
	var search = [];
	tags.map(function(v) {
		try { search.push(new mongodb.ObjectID(v)); } catch(e) {}
	});
  var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.find({destroy: {$exists: false}}).sort({"ctime": -1, _id: -1}).toArray(function (e, d) {
    if(e) { return cb(e); }
		d.map(function(v) {
			result.push(v._id.toString());
		});
    cb(null, result);
  });
};
Bot.prototype.checkFileExists = function (files, cb) {
	// Reserved word: 'offline:', 'tag:'
	if(Array.isArray(tags)) { tags = [tags]; }
	uid = dvalue.default(uid, 'default');
	var result = [];
	var search = [];
	tags.map(function(v) {
		if(/^offline:/.test(v) || /^tag:/.test(v)) { result.push(v); }
		try { search.push(new mongodb.ObjectID(v)); } catch(e) {}
	});
  var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.find({_id: {$in: search}, destroy: {$exists: false}}).sort({"ctime": -1, _id: -1}).toArray(function (e, d) {
    if(e) { return cb(e); }
		d.map(function(v) {
			result.push(v._id.toString());
		});
    cb(null, result);
  });
};

Bot.prototype.addToTag = function (files, tags, cb) {
	if(!Array.isArray(files)) { files = [files]; }
	if(!Array.isArray(tags)) { tags = [tags]; }
	
};
Bot.prototype.assignToTag = function () {};
Bot.prototype.listFilesByTag = function () {};
Bot.prototype.editTag = function () {};
Bot.prototype.deleteTag = function () {};

Bot.prototype.createAlbum = function () {};
Bot.prototype.listAlbum = function () {};
Bot.prototype.addToAlbum = function () {};
Bot.prototype.assignToAlbum = function () {};
Bot.prototype.listFilesByAlbums = function () {};
Bot.prototype.editAlbum = function () {};
Bot.prototype.deleteAlbum = function () {};

module.exports = Bot;
