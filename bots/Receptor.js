var SocketBot = require('./_SocketBot.js')
,	util = require('util')
,	express = require('express')
,	Session = require('express-session')
,	favicon = require('serve-favicon')
,	fs = require('fs')
,	path = require('path')
,	bodyParser = require('body-parser')
,	multer  = require('multer');

var Receptor = function(config) {
	this.init(config);
};

util.inherits(Receptor, SocketBot);

Receptor.prototype.init = function(config) {
	Receptor.super_.prototype.init.call(this, config);
	var self = this;

	var upload = "./uploads/";
	if (!fs.existsSync(upload)){
		fs.mkdirSync(upload);
	}

	this.router = express.Router();
	this.app = express();
	this.http = require('http').createServer(this.app);
	this.session = Session({
		secret: this.randomID(),
		resave: true,
		saveUninitialized: true
	});

	this.app.set('port', 80);
	this.app.use(this.session);
	this.app.use(bodyParser.urlencoded({ extended: false }));
	this.app.use(bodyParser.json());
	this.app.use(multer({ dest: './uploads/'}));
	this.app.use(this.filter);
	this.app.use(express.static(path.join(__dirname, '../public')));
	this.app.use(this.router);

	this.ctrl = [];

	/*
    this.router.all('/', function(req, res, next) {
            res.writeHead(302, {'Location': 'http://210.61.13.14'});
            res.end();
    });
	*/
	// this.router.all('*', function(req, res, next) { self.route(req, res, next); });
};

Receptor.prototype.addController = function(ctrl) {
	var self = this;
	if(ctrl.name) { self.ctrl[ctrl.name] = ctrl; }
	ctrl.setAsk(function(msg, tag) {
		var rs = self.api(msg, tag);
		return rs;
	});

	if(!Array.isArray(ctrl.path)) {
		ctrl.path = [ctrl.path];
	}

	for(var k in ctrl.path) {
		if(!ctrl.path[k]) { continue; }

		if(typeof(ctrl.path[k]) == "string") { ctrl.path[k] = {"method": "all", "path": ctrl.path[k]}; }
		var method = (ctrl.path[k].method || 'all').toLowerCase()
		,	path = ctrl.path[k].path;

		if(typeof(this.router[method]) == "function") {
			this.router[method](path, function(req, res, next) {
				var msg = {
					"url": req._parsedOriginalUrl.pathname,
					"method": req.method,
					"params": req.params,
					"query": req.query,
					"body": req.body,
					"sessionID": req.sessionID,
					"session": req.session,
					"files": req.files
				};

				res.result = ctrl.exec(msg);
				if(res.result && res.result.session) {
					var sess = res.result.session;
					for(var k in sess) {
						if(sess[k] === null) {
							delete req.session[k];
						}
						else {
							req.session[k] = sess[k];
						}
					}
				}

				res.send(res.result);
			});
		}
	}
};

Receptor.prototype.start = function() {
	Receptor.super_.prototype.start.apply(this);
	var self = this;
	
	var httpPort = this.app.get('port');
	this.http.listen(httpPort, function () {});
};

Receptor.prototype.stop = function() {
	Receptor.super_.prototype.stop.apply(this);
	this.http.close();
};

Receptor.prototype.filter = function(req, res, next) {
	res.result = {"result": 0, "message": "", data: {}};
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Content-Type,Content-Length, Authorization, Accept,X-Requested-With");
	next();
};

Receptor.prototype.route = function(req, res, next) {
	var msg = {
		"url": req._parsedOriginalUrl.pathname,
		"method": req.method,
		"params": req.params,
		"query": req.query,
		"body": req.body,
		"sessionID": req.sessionID,
		"session": req.session
	};

	var tag = msg.url.substr(1).split('/').join('.');
	var rs = this.api(tag, msg);
	res.send(rs);
};

Receptor.prototype.api = function(msg, tag) {
	var rs = this.ctrl[tag].exec(msg);
	return rs;
};

module.exports = Receptor;