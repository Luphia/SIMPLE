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
var descAlbumFile = function (tag) {
	if(tag === undefined) { return tag; }
	var album = dvalue.default(tag, { _id: "", files: [] });
	album.aid = album._id.toString();
	delete album.type;
	delete album._id;
	return album;
};
var descAlbum = function (tag) {
	var album = descAlbumFile(tag);
	album.items = album.files.length;
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
	if(newTag.files !== undefined) {
		this.checkFileExists(uid, newTag.files, function (e, d) {
			if(e) { return cb(e); }
			newTag.files = d;
			collection.insertOne(newTag, {}, function (_e, _d) {
				if(_e) { return cb(_e); }
				cb(null, newTag);
			});
		});
	}
	else {
		collection.insertOne(newTag, {}, function (e, d) {
			if(e) { return cb(e); }
			cb(null, newTag);
		});
	}
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
Bot.prototype.checkFileExists = function (uid, files, cb) {
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

Bot.prototype.assignTag = function (uid, files, tags, remove, cb) {
	if(!Array.isArray(files)) { files = [files]; }
	if(!Array.isArray(tags)) { tags = [tags]; }
	uid = dvalue.default(uid, 'default');
	var addTag, removeTag, predone, done;
	var cname = [uid, 'tags'].join('_');
	var pretodo = 2;
	var todo = 2;
	var collection = this.db.collection(cname);
	var predone = function () {
		if(--pretodo == 0) {
			addTag(_files, _tags, done);
			if(remove) { removeTag(_files, _tags, done); }
		}
	};
	var done = function () {
		if(--done == 0) {
			cb(null, {files: files, tags: tags})
		}
	};

	this.checkTagExists(tags, function (e, d) {
		if(e) { return cb(e); }
		tags = d;
		predone();
	});
	this.checkFileExists(files, function (e, d) {
		if(e) { return cb(e); }
		files = d;
		predone();
	});

	addTag = function (_files, _tags, _cb) {
		collection.findAndModify(
			{_id: {$in: _tags}},
			{},
			{$addToSet: {files: {$each: _files}}},
			{},
			function (e, d) {
				if(e) { return cb(e); }
				else { done(); }
			}
		);
	};
	removeTag = function (_files, _tags, _cb) {
		collection.findAndModify(
			{_id: {$nin: _tags}},
			{},
			{$pull: {files: {$in: _files}}},
			{},
			function (e, d) {
				if(e) { return cb(e); }
				else { done(); }
			}
		);
	};
};
Bot.prototype.listFilesByTag = function (uid, tag, cb) {
	uid = dvalue.default(uid, 'default');
	var tid = '';
	try { tid = new mongodb.ObjectID(tag); } catch(e) {}
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.findOne({_id: tid, destroy: {$exists: false}}, {}, function (e, d) {
    if(e) { return cb(e); }
    cb(null, d);
  });
};
Bot.prototype.editTag = function (tag, cb) {};
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
Bot.prototype.assignAlbum = function (uid, files, tags, remove, cb) {
	if(!Array.isArray(files)) { files = [files]; }
	if(!Array.isArray(tags)) { tags = [tags]; }
	uid = dvalue.default(uid, 'default');
	var addTag, removeTag, predone, done;
	var cname = [uid, 'tags'].join('_');
	var pretodo = 2;
	var todo = 2;
	var collection = this.db.collection(cname);
	var predone = function () {
		if(--pretodo == 0) {
			addTag(_files, _tags, done);
			if(remove) { removeTag(_files, _tags, done); }
		}
	};
	var done = function () {
		if(--done == 0) {
			cb(null, {files: files, tags: tags})
		}
	};

	this.checkTagExists(tags, function (e, d) {
		if(e) { return cb(e); }
		tags = d;
		predone();
	});
	this.checkFileExists(files, function (e, d) {
		if(e) { return cb(e); }
		files = d;
		predone();
	});

	addTag = function (_files, _tags, _cb) {
		collection.findAndModify(
			{_id: {$in: _tags}, type: 'album'},
			{},
			{$addToSet: {files: {$each: _files}}},
			{},
			function (e, d) {
				if(e) { return cb(e); }
				else { done(); }
			}
		);
	};
	removeTag = function (_files, _tags, _cb) {
		collection.findAndModify(
			{_id: {$nin: _tags}, type: 'album'},
			{},
			{$pull: {files: {$in: _files}}},
			{},
			function (e, d) {
				if(e) { return cb(e); }
				else { done(); }
			}
		);
	};
};
Bot.prototype.listFilesByAlbum = function (uid, album, cb) {
	uid = dvalue.default(uid, 'default');
	var aid = '';
	try { aid = new mongodb.ObjectID(album); } catch(e) {}
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.findOne({_id: aid, destroy: {$exists: false}}, {}, function (e, d) {
    if(e) { return cb(e); }
    cb(null, descAlbumFile(d));
  });
};
Bot.prototype.albumUpdate = function (uid, cond, updateQuery, cb) {
	var uid = dvalue.default(uid, 'default');
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.findAndModify(
		cond,
		{},
		updateQuery,
		{},
		function (e, d) {
			if(e) { return cb(e); }
			else if(!d.lastErrorObject.updatedExisting) {
				e = new Error("album not found: " + _id);
				e.code = 1;
				return cb(e);
			}
			else {
				var rs = dvalue.clone(d.value);
				return cb(descAlbumFile(rs));
			}
		}
	);
};
Bot.prototype.albumAddFile = function (uid, cond, files, cb) {
	var self = this;
	var uid = dvalue.default(uid, 'default');
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	var updateQuery = {};
	this.checkFileExists(uid, files, function (e, d) {
		if(Array.isArray(d)) {
			updateQuery['$addToSet'] = {files: {$each: d}};
			self.albumUpdate(uid, cond, updateQuery, function (e1, d1) {
				if(e1) { cb(e1); }
				else { cb(null, d); }
			});
		}
		else {
			cb(e);
		}
	});
};
Bot.prototype.albumRemoveFile = function (uid, cond, files, cb) {
	if(!Array.isArray(files)) { files = [files]; }
	var uid = dvalue.default(uid, 'default');
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	var updateQuery = {$pull: {files: {$in: files}}}
	this.albumUpdate(uid, cond, updateQuery, function (e, d) {
			if(e) { cb(e); }
			else { cb(null, d); }
	});
};
Bot.prototype.albumSetCover = function (uid, cond, cover, cb) {
	var self = this;
	var files = [cover];
	var updateQuery = {$set: {cover: cover}};
	this.albumAddFile(uid, cond, files, function (e, d) {
		if(e || !d) { cb(e); }
		else {
			self.albumUpdate(uid, cond, updateQuery);
		}
	});
};
Bot.prototype.editAlbum = function (album, cb) {
	var uid = dvalue.default(album.uid, 'default');
	var _id = '';
	try { _id = new mongodb.ObjectID(album.aid); } catch(e) {}
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	var updateQuery = {};
	var set = {};
	var todo = 1;
	updateQuery['$set'] = set;

	delete album.aid;
	delete album.uid;
	for(var k in album) {
		if(k.indexOf('$') == 0) { continue; }
		set[k] = album[k];
	}

	if(Array.isArray(album.files)) {

	}
	else {

	}

	//
	if(Array.isArray(album['$remove'])) {
		updateQuery['$pull'] = {files: {$in: album['$remove']}};
		console.log(updateQuery['$pull']);
	}

	if(Array.isArray(album['$add'])) {
		todo++;
		this.checkFileExists(uid, album['$add'], function (e, d) {
			if(Array.isArray(d)) { updateQuery['$addToSet'] = {files: {$each: d}} }
			done();
		});
	}
	else if(Array.isArray(album.files)) {
		this.checkFileExists(uid, album.files, function (e, d) {
			if(Array.isArray(d)) { set.files = d; }
			done();
		});
	}
	done();
};
Bot.prototype.deleteAlbum = function () {};

module.exports = Bot;
