const url = require('url');
const passport = require('passport');
const FacebookStrategy = require('passport-facebook').Strategy;
const FacebookTokenStrategy = require('passport-facebook-token');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GoogleTokenStrategy = require('passport-google-token');
const TwitterStrategy = require('passport-twitter').Strategy;
const TwitterTokenStrategy = require('passport-twitter-token');

const User = require(path.join(__dirname, '../Models/User'));
const Parent = require(path.join(__dirname, '_Bot.js'));

var db, logger, i18n, APIURL;

var Bot = class extends Parent {
	constructor() {
		super();
		this.name = path.parse(__filename).base.replace(/.js$/, '');
	}
	init(config) {
		return super.init(config).then(v => {
			i18n = this.i18n;
			logger = this.logger;
			db = this.db;
			APIURL = config.main.url;
			return Promise.resolve(v);
		}).then(v => {
			super.getBot('Receptor').then(receptor => {
				receptor.register(
					{method: 'post', authorization: false, hashcash: false},
					'/register',
					(options) => { return this.apiRegister(options); }
				);
			});
			return Promise.resolve(v);
		});
	}
}

var Bot = function (config) {
	if (!config) config = {};
	this.init(config);
};

util.inherits(Bot, ParentBot);

Bot.prototype.init = function (config) {
	var self = this;
	Bot.super_.prototype.init.call(this, config);
	if(!config.facebook) { return false; }
	var facebookProcess = function (accessToken, refreshToken, profile, done) {
		if(!profile) { done(null, false); return; }
		var user = {
			type: 'facebook',
			accessToken: accessToken,
			refreshToken: refreshToken,
			condition: {
				'facebook.id': profile.id
			},
			profile: {
				username: profile.displayName,
				email: profile.emails[0].value,
				emails: profile.emails.map(function (v) { return v.value; }),
				photo: profile.photos[0].value,
				photos: profile.photos.map(function (v) { return v.value; }),
				allowmail: false,
				facebook: {
					id: profile.id,
					username: profile.displayName,
					emails: profile.emails,
					photos: profile.photos
				}
			}
		};
		self.getUserID(user, done);
	};
	var googleProcess = function (accessToken, refreshToken, profile, done) {
		if(!profile) { done(null, false); return; }
		var user = {
			type: 'google',
			accessToken: accessToken,
			refreshToken: refreshToken,
			condition: {
				'google.id': profile.id
			},
			profile: {
				username: profile.displayName,
				email: profile.emails[0].value,
				emails: profile.emails.map(function (v) { return v.value; }),
				photo: profile.photos.url,
				photos: profile.photos.map(function (v) { return v.value; }),
				allowmail: false,
				google: {
					id: profile.id,
					username: profile.displayName,
					emails: profile.emails,
					photos: profile.photos
				}
			}
		};
		self.getUserID(user, done);
	};
	var twitterProcess = function (accessToken, refreshToken, profile, done) {
		if(!profile) { done(null, false); return; }
		var user = {
			type: 'twitter',
			accessToken: accessToken,
			refreshToken: refreshToken,
			condition: {
				'twitter.id': profile.id
			},
			profile: {
				username: profile.displayName,
				email: profile.emails,
				emails: profile.emails,
				photo: profile.photos[0].value,
				photos: profile.photos.map(function (v) { return v.value; }),
				allowmail: false,
				twitter: {
					id: profile.id,
					username: profile.displayName,
					emails: profile.emails,
					photos: profile.photos,
				}
			}
		};
		self.getUserID(user, done);
	};

	passport.use(new FacebookStrategy({
			clientID: config.facebook.id,
			clientSecret: config.facebook.secret,
			callbackURL: "/auth/facebook/callback",
			profileFields: ['id', 'displayName', 'photos', 'email']
		},
		facebookProcess
	));
	passport.use(new FacebookTokenStrategy({
			clientID: config.facebook.id,
			clientSecret: config.facebook.secret,
			profileFields: ['id', 'displayName', 'photos', 'email']
		},
		facebookProcess
	));
	passport.serializeUser(function(user, done) {
			done(null, user);
	});

	passport.deserializeUser(function(user, done) {
			done(null, user);
	});

	passport.use(new GoogleStrategy({
		clientID: config.google.id,
		clientSecret: config.google.secret,
		callbackURL: "/auth/google/callback",
	}, googleProcess));
	passport.use(new TwitterStrategy({
		consumerKey: config.twitter.id,
		consumerSecret: config.twitter.secret,
		callbackURL: "/auth/twitter/callback",
	}, twitterProcess));
};

Bot.prototype.start = function () {

};

Bot.prototype.initialize = function (req, res, next) {
	passport.initialize()(req, res, next);
};
Bot.prototype.facebook_authenticate = function (req, res, next) {
	passport.authenticate('facebook', { scope: ['public_profile', 'email'] })(req, res, next);
};
Bot.prototype.google_authenticate = function (req, res, next) {
	passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
};
Bot.prototype.twitter_authenticate = function (req, res, next) {
	passport.authenticate('twitter', { scope: ['public_profile', 'email'] })(req, res, next);
};
Bot.prototype.facebook_callback = function (req, res, next) {
	var self = this;
	passport.authenticate('facebook', function (err, user, info) {
		var passto = function (query) {
			if(self.config.frontend) {
				var redirectURL, tmp = url.parse(self.config.frontend + '/login3rdParty');
				query.data = new Buffer(JSON.stringify(query.data)).toString('base64');
				tmp.query = query;
				res.result.setResult(302);
				res.result.setData({Location: url.format(tmp)});
			}
			next();
		};

		if(!user) {
			// auth failed
			var e = new Error('Facebook authorization failed');
			e.code = '68101';
			res.result.setErrorCode(e.code);
			res.result.setMessage(e.message);

			passto(res.result.toJSON());
		}
		else {
			self.getToken(user, function (e, d) {
				if(e) {
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else if(!d) {
					var e = new Error('Facebook authorization failed');
					e.code = '68101';
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else {
					res.result.setResult(1);
					res.result.setMessage('Login with Facebook');
					res.result.setData(d);
					res.result.setSession({uid: d.uid});
				}
				passto(res.result.toJSON());
			});
		}
	})(req, res, next);
};
Bot.prototype.facebook_token = function (req, res, next) {
	var self = this;
	req.query.access_token = req.query.access_token || req.params.access_token;
	passport.authenticate('facebook-token', function (err, user, info) {
		if(!user) {
			// auth failed
			var e = new Error('Facebook authorization failed');
			e.code = '68101';
			res.result.setErrorCode(e.code);
			res.result.setMessage(e.message);
			next();
		}
		else {
			self.getToken(user, function (e, d) {
				if(e) {
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else if(!d) {
					var e = new Error('Facebook authorization failed');
					e.code = '68101';
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else {
					res.result.setResult(1);
					res.result.setMessage('Login with Facebook');
					res.result.setData(d);
					res.result.setSession({uid: d.uid});
				}
				next();
			});
		}
	})(req, res, next);
};
Bot.prototype.google_callback = function (req, res, next) {
	var self = this;
	passport.authenticate('google', function (err, user, info) {
		var passto = function (query) {
			if(self.config.frontend) {
				var redirectURL, tmp = url.parse(self.config.frontend + '/login3rdParty');
				query.data = new Buffer(JSON.stringify(query.data)).toString('base64');
				tmp.query = query;
				res.result.setResult(302);
				res.result.setData({Location: url.format(tmp)});
			}
			next();
		};

		if(!user) {
			// auth failed
			var e = new Error('Google authorization failed');
			e.code = '68101';
			res.result.setErrorCode(e.code);
			res.result.setMessage(e.message);

			passto(res.result.toJSON());
		}
		else {
			self.getToken(user, function (e, d) {
				if(e) {
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else if(!d) {
					var e = new Error('Google authorization failed');
					e.code = '68101';
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else {
					res.result.setResult(1);
					res.result.setMessage('Login with Google');
					res.result.setData(d);
					res.result.setSession({uid: d.uid});
				}
				passto(res.result.toJSON());
			});
		}
	})(req, res, next);
};
Bot.prototype.google_token = function (req, res, next) {
	next();
};
Bot.prototype.twitter_callback = function (req, res, next) {
	var self = this;
	passport.authenticate('twitter', function (err, user, info) {
		var passto = function (query) {
			if(self.config.frontend) {
				var redirectURL, tmp = url.parse(self.config.frontend + '/login3rdParty');
				query.data = new Buffer(JSON.stringify(query.data)).toString('base64');
				tmp.query = query;
				res.result.setResult(302);
				res.result.setData({Location: url.format(tmp)});
			}
			next();
		};

		if(!user) {
			// auth failed
			var e = new Error('Google authorization failed');
			e.code = '68101';
			res.result.setErrorCode(e.code);
			res.result.setMessage(e.message);

			passto(res.result.toJSON());
		}
		else {
			self.getToken(user, function (e, d) {
				if(e) {
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else if(!d) {
					var e = new Error('Google authorization failed');
					e.code = '68101';
					res.result.setErrorCode(e.code);
					res.result.setMessage(e.message);
				}
				else {
					res.result.setResult(1);
					res.result.setMessage('Login with Twitter');
					res.result.setData(d);
					res.result.setSession({uid: d.uid});
				}
				passto(res.result.toJSON());
			});
		}
	})(req, res, next);
};
Bot.prototype.twitter_token = function (req, res, next) {
	next();
};
Bot.prototype.getUserID = function (user, cb) {
	var bot = this.getBot('User');
	bot.getUserBy3rdParty(user, cb);
};
Bot.prototype.getToken = function (user, cb) {
	var bot = this.getBot('User');
	bot.createToken(user, cb);
};

module.exports = Bot;
