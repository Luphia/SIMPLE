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

var tag2Album = function (tag) {
	var album = dvalue.default(tag, {
		name: '',
		cover: '',
		files: []
	});
	album.type = 'album';
	return album;
};
var descAlbum = function (tag) {
	if(tag === undefined) { return tag; }
	var album = dvalue.default(tag, { _id: "", files: [] });
	album.aid = album._id.toString();
	album.items = album.files.length;
	delete album.type;
	delete album._id;
	delete album.files;
	return album;
};

Bot.prototype.init = function (config) {
  Bot.super_.prototype.init.call(this, config);
};

Bot.prototype.start = function () {

};

/* require: tag, tag.uid */
Bot.prototype.createTag = function (tag, cb) {
	var uid = dvalue.default(tag.uid, 'default');
	delete tag.uid;
	var now = new Date().getTime();
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	var newTag = {name: '', type: '', ctime: now};
	for(var k in tag) {
		if(k.indexOf('$') == 0) { continue; }
		newTag[k] = tag[k];
	}
	collection.insertOne(newTag, {}, function (e, d) {
		if(e) { return cb(e); }
		cb(null, newTag);
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
	if(!Array.isArray(tags)) { tags = [tags]; }
	uid = dvalue.default(uid, 'default');
	var result = [];
	var search = [];
	tags.map(function(v) {
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
Bot.prototype.checkAlbumExists = function (uid, albums, cb) {
	if(!Array.isArray(albums)) { albums = [albums]; }
	uid = dvalue.default(uid, 'default');
	var result = [];
	var search = [];
	albums.map(function(v) {
		try { search.push(new mongodb.ObjectID(v)); } catch(e) {}
	});
  var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.find({_id: {$in: search}, type: 'album', destroy: {$exists: false}}).sort({"ctime": -1, _id: -1}).toArray(function (e, d) {
    if(e) { return cb(e); }
		d.map(function(v) {
			result.push(v._id.toString());
		});
    cb(null, result);
  });
};
Bot.prototype.checkFileExists = function (files, cb) {
	// Reserved word: 'offline:', 'tag:'
	if(!Array.isArray(files)) { files = [files]; }
	uid = dvalue.default(uid, 'default');
	var result = [];
	var search = [];
	files.map(function(v) {
		if(/^offline:/.test(v) || /^tag:/.test(v)) { result.push(v); }
		else { try { search.push(new mongodb.ObjectID(v)); } catch(e) {} }
	});
  var cname = [uid, 'files'].join('_');
	var collection = this.db.collection(cname);
	collection.find({_id: {$in: search}, destroy: {$exists: false}}).sort({"ctime": -1, _id: -1}).toArray(function (e, d) {
    if(e) { return cb(e); }
		d.map(function(v) {
			result.push(v._id.toString());
		});
    cb(null, result);
  });
};

Bot.prototype.assignTag = function (files, tags, remove, cb) {
	if(!Array.isArray(files)) { files = [files]; }
	if(!Array.isArray(tags)) { tags = [tags]; }
	var pretodo = 2;
	var todo = 0;
	var predone = function () {
		if(--pretodo == 0) {  }
	};
	var done = function () {

	};

	this.checkTagExists(tags, function (e, d) {});
	this.checkFileExists(files, function (e, d) {});

	var addTag = function (_files, _tags, _cb) {

	};
	var removeTag = function (_files, _tags, _cb) {

	};
};
Bot.prototype.listFilesByTag = function () {};
Bot.prototype.editTag = function () {};
Bot.prototype.deleteTag = function (tag, cb) {

};

Bot.prototype.createAlbum = function (tag, cb) {
	var album = tag2Album(tag);
	this.createTag(album, function (e, d) {
		cb(e, descAlbum(d));
	});
};
Bot.prototype.listAlbum = function (uid, cb) {
	uid = dvalue.default(uid, 'default');
  var cname = [uid, 'tags'].join('_');
  var collection = this.db.collection(cname);
  collection.find({type: 'album', destroy: {$exists: false}}).sort({"ctime": -1, _id: -1}).toArray(function (e, d) {
    if(e) { return cb(e); }
		d = d.map(descAlbum);
    cb(null, d);
  });
};
Bot.prototype.assignAlbum = function () {};
Bot.prototype.listFilesByAlbums = function () {};
Bot.prototype.editAlbum = function () {};
Bot.prototype.deleteAlbum = function () {};

module.exports = Bot;
