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
	var todo = 0;
	var collection = this.db.collection(cname);
	var tids = tags.map(function (v) {
		try { v = new mongodb.ObjectID(v); } catch(e) {}
		return v;
	});
	var predone = function () {
		if(--pretodo == 0) {
			addTag(files, tags, done);
			if(remove) { removeTag(files, tags, done); }
		}
	};
	var done = function () {
		if(--done == 0) {
			cb(null, {files: files, tags: tags})
		}
	};

	this.checkTagExists(uid, tags, function (e, d) {
		if(e) { return cb(e); }
		tags = d;
		predone();
	});
	this.checkFileExists(uid, files, function (e, d) {
		if(e) { return cb(e); }
		files = d;
		predone();
	});

	addTag = function (_files, _tags, _cb) {
		todo++;
		collection.update(
			{_id: {$in: tids}},
			{$addToSet: {files: {$each: _files}}},
			{multi: true},
			function (e, d) {
				if(e) { return cb(e); }
				else { done(); }
			}
		);
	};
	removeTag = function (_files, _tags, _cb) {
		todo++;
		collection.update(
			{_id: {$nin: tids}},
			{$pull: {files: {$in: _files}}},
			{multi: true},
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
	var todo = 0;
	var collection = this.db.collection(cname);
	var tids = tags.map(function (v) {
		try { v = new mongodb.ObjectID(v); } catch(e) {}
		return v;
	});
	var predone = function () {
		if(--pretodo == 0) {
			addTag(files, tags, done);
			if(remove) { removeTag(files, tags, done); }
		}
	};
	var done = function () {
		if(--todo == 0) {
			cb(null, {files: files, albums: tags})
		}
	};

	this.checkTagExists(uid, tags, function (e, d) {
		if(e) { return cb(e); }
		tags = d;
		predone();
	});
	this.checkFileExists(uid, files, function (e, d) {
		if(e) { return cb(e); }
		files = d;
		predone();
	});

	addTag = function (_files, _tags, _cb) {
		todo++;
		collection.update(
			{_id: {$in: tids}, type: 'album'},
			{$addToSet: {files: {$each: _files}}},
			{multi: true},
			function (e, d) {
				if(e) { return cb(e); }
				else { done(); }
			}
		);
	};
	removeTag = function (_files, _tags, _cb) {
		todo++;
		collection.update(
			{_id: {$nin: tids}, type: 'album'},
			{$pull: {files: {$in: _files}}},
			{multi: true},
			function (e, d) {
				if(e) { return cb(e); }
				else { done(); }
			}
		);
	};
};
Bot.prototype.listFilesByAlbum = function (uid, aid, cb) {
	uid = dvalue.default(uid, 'default');
	try { aid = new mongodb.ObjectID(aid); } catch(e) {}
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.findOne({_id: aid, destroy: {$exists: false}}, {}, function (e, d) {
    if(e) { return cb(e); }
		else if(!d) {
			e = new Error("album not found: " + aid);
			e.code = 1;
			return cb(e);
		}
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
				e = new Error("album not found");
				e.code = 1;
				return cb(e);
			}
			else {
				var rs = dvalue.clone(d.value);
				return cb(null, descAlbumFile(rs));
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
	console.log('albumRemoveFile', uid, cond, files);
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
	var self = this;
	var uid = dvalue.default(album.uid, 'default');
	var _id = '';
	try { _id = new mongodb.ObjectID(album.aid); } catch(e) {}
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	var cond;
	var updateQuery;
	var set = {};
	var todo = 1;
	var rs;
	var err;
	var done = function (e, d) {
		rs = d;
		err = e? e: err;
		if(--todo == 0) {
			if(rs) { cb(null, d); }
			else { cb(err, rs); }
		}
	};

	delete album.aid;
	delete album.uid;
	for(var k in album) {
		if(k.indexOf('$') == 0) { continue; }
		set[k] = album[k];
	}

	cond = {_id: _id, type: 'album', destroy: {$exists: false}};
	updateQuery = {$set: set};
	this.albumUpdate(uid, cond, updateQuery, function (e, d) {
		d = dvalue.default(set, d);
		var albumResult = descAlbumFile(d);
		albumResult.aid = _id;
		if(Array.isArray(album['$add'])) {
			todo++;
			self.albumAddFile(uid, cond, album['$add'], function (e1, d1) {
				if(Array.isArray(d1)) { d1.map(function (v) {
					var tmpi =  albumResult.files.indexOf(v);
					if(tmpi == -1) { albumResult.files.push(v); }
				}); }
				done(e1, albumResult);
			});
		}
		if(Array.isArray(album['$remove'])) {
			todo++;
			self.albumRemoveFile(uid, cond, album['$remove'], function (e1, d1) {
				if(Array.isArray(d1)) { d1.map(function (v) {
					var tmpi =  albumResult.files.indexOf(v);
					if(tmpi > -1) { albumResult.files.splice(tmpi, 1); }
				}); }
				done(e1, albumResult);
			});
		}
		done(e, albumResult);
	});
};
Bot.prototype.deleteAlbum = function (uid, aid, cb) {
	var now = new Date().getTime();
	var uid = dvalue.default(uid, 'default');
	var _id = '';
	try { _id = new mongodb.ObjectID(aid); } catch(e) {}
	var cond = {_id: _id, type: 'album', destroy: {$exists: false}};
	var updateQuery = {$set: {destroy: now}};
	this.albumUpdate(uid, cond, updateQuery, cb);
};
Bot.prototype.deleteAlbums = function (uid, aid, cb) {
	var now = new Date().getTime();
	var uid = dvalue.default(uid, 'default');
	if(!Array.isArray(aid)) { aid = [aid]; }
	aid = aid.map(function (v) {
		try { return new mongodb.ObjectID(v); } catch(e) {}
	});
	var cond = {_id: {$in: aid}, type: 'album', destroy: {$exists: false}};
	var updateQuery = {$set: {destroy: now}};
	var cname = [uid, 'tags'].join('_');
	var collection = this.db.collection(cname);
	collection.update(
		cond,
		updateQuery,
		{multi: true},
		function (e, d) {
			var n;
			if(e) { return cb(e); }
			else {
				try { n = d.result.nModified; } catch(e) { n = 0; }
				return cb(null, n);
			}
		}
	);
};

module.exports = Bot;
