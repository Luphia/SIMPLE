const ParentBot = require('./_Bot.js');
const util = require('util');
const raid2x = require('raid2x');
const dvalue = require('dvalue');
const textype = require('textype');

var sprintf = (function() {
	function get_type(variable) {
		return Object.prototype.toString.call(variable).slice(8, -1).toLowerCase();
	}
	function str_repeat(input, multiplier) {
		for (var output = []; multiplier > 0; output[--multiplier] = input) {/* do nothing */}
		return output.join('');
	}

	var str_format = function() {
		if (!str_format.cache.hasOwnProperty(arguments[0])) {
			str_format.cache[arguments[0]] = str_format.parse(arguments[0]);
		}
		return str_format.format.call(null, str_format.cache[arguments[0]], arguments);
	};

	str_format.object_stringify = function(obj, depth, maxdepth, seen) {
		var str = '';
		if (obj != null) {
			switch( typeof(obj) ) {
			case 'function':
				return '[Function' + (obj.name ? ': '+obj.name : '') + ']';
			    break;
			case 'object':
				if ( obj instanceof Error) { return '[' + obj.toString() + ']' };
				if (depth >= maxdepth) return '[Object]'
				if (seen) {
					// add object to seen list
					seen = seen.slice(0)
					seen.push(obj);
				}
				if (obj.length != null) { //array
					str += '[';
					var arr = []
					for (var i in obj) {
						if (seen && seen.indexOf(obj[i]) >= 0) arr.push('[Circular]');
						else arr.push(str_format.object_stringify(obj[i], depth+1, maxdepth, seen));
					}
					str += arr.join(', ') + ']';
				} else if ('getMonth' in obj) { // date
					return 'Date(' + obj + ')';
				} else { // object
					str += '{';
					var arr = []
					for (var k in obj) {
						if(obj.hasOwnProperty(k)) {
							if (seen && seen.indexOf(obj[k]) >= 0) arr.push(k + ': [Circular]');
							else arr.push(k +': ' +str_format.object_stringify(obj[k], depth+1, maxdepth, seen));
						}
					}
					str += arr.join(', ') + '}';
				}
				return str;
				break;
			case 'string':
				return '"' + obj + '"';
				break
			}
		}
		return '' + obj;
	}

	str_format.format = function(parse_tree, argv) {
		var cursor = 1, tree_length = parse_tree.length, node_type = '', arg, output = [], i, k, match, pad, pad_character, pad_length;
		for (i = 0; i < tree_length; i++) {
			node_type = get_type(parse_tree[i]);
			if (node_type === 'string') {
				output.push(parse_tree[i]);
			}
			else if (node_type === 'array') {
				match = parse_tree[i]; // convenience purposes only
				if (match[2]) { // keyword argument
					arg = argv[cursor];
					for (k = 0; k < match[2].length; k++) {
						if (!arg.hasOwnProperty(match[2][k])) {
							throw new Error(sprintf('[sprintf] property "%s" does not exist', match[2][k]));
						}
						arg = arg[match[2][k]];
					}
				}
				else if (match[1]) { // positional argument (explicit)
					arg = argv[match[1]];
				}
				else { // positional argument (implicit)
					arg = argv[cursor++];
				}

				if (/[^sO]/.test(match[8]) && (get_type(arg) != 'number')) {
					throw new Error(sprintf('[sprintf] expecting number but found %s "' + arg + '"', get_type(arg)));
				}
				switch (match[8]) {
					case 'b': arg = arg.toString(2); break;
					case 'c': arg = String.fromCharCode(arg); break;
					case 'd': arg = parseInt(arg, 10); break;
					case 'e': arg = match[7] ? arg.toExponential(match[7]) : arg.toExponential(); break;
					case 'f': arg = match[7] ? parseFloat(arg).toFixed(match[7]) : parseFloat(arg); break;
				    case 'O': arg = str_format.object_stringify(arg, 0, parseInt(match[7]) || 5); break;
					case 'o': arg = arg.toString(8); break;
					case 's': arg = ((arg = String(arg)) && match[7] ? arg.substring(0, match[7]) : arg); break;
					case 'u': arg = Math.abs(arg); break;
					case 'x': arg = arg.toString(16); break;
					case 'X': arg = arg.toString(16).toUpperCase(); break;
				}
				arg = (/[def]/.test(match[8]) && match[3] && arg >= 0 ? '+'+ arg : arg);
				pad_character = match[4] ? match[4] == '0' ? '0' : match[4].charAt(1) : ' ';
				pad_length = match[6] - String(arg).length;
				pad = match[6] ? str_repeat(pad_character, pad_length) : '';
				output.push(match[5] ? arg + pad : pad + arg);
			}
		}
		return output.join('');
	};

	str_format.cache = {};

	str_format.parse = function(fmt) {
		var _fmt = fmt, match = [], parse_tree = [], arg_names = 0;
		while (_fmt) {
			if ((match = /^[^\x25]+/.exec(_fmt)) !== null) {
				parse_tree.push(match[0]);
			}
			else if ((match = /^\x25{2}/.exec(_fmt)) !== null) {
				parse_tree.push('%');
			}
			else if ((match = /^\x25(?:([1-9]\d*)\$|\(([^\)]+)\))?(\+)?(0|'[^$])?(-)?(\d+)?(?:\.(\d+))?([b-fosOuxX])/.exec(_fmt)) !== null) {
				if (match[2]) {
					arg_names |= 1;
					var field_list = [], replacement_field = match[2], field_match = [];
					if ((field_match = /^([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
						field_list.push(field_match[1]);
						while ((replacement_field = replacement_field.substring(field_match[0].length)) !== '') {
							if ((field_match = /^\.([a-z_][a-z_\d]*)/i.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else if ((field_match = /^\[(\d+)\]/.exec(replacement_field)) !== null) {
								field_list.push(field_match[1]);
							}
							else {
								throw new Error('[sprintf] ' + replacement_field);
							}
						}
					}
					else {
                        throw new Error('[sprintf] ' + replacement_field);
					}
					match[2] = field_list;
				}
				else {
					arg_names |= 2;
				}
				if (arg_names === 3) {
					throw new Error('[sprintf] mixing positional and named placeholders is not (yet) supported');
				}
				parse_tree.push(match);
			}
			else {
				throw new Error('[sprintf] ' + _fmt);
			}
			_fmt = _fmt.substring(match[0].length);
		}
		return parse_tree;
	};

	return str_format;
})();

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

/* require: email, password(md5) */
/* optional: nickname */
/* 1: invalid e-mail, 2: account exist */
Bot.prototype.regist = function (email, password, cb) {
	var self = this;
	cb = dvalue.default(cb, function () {});
	// check email
	if(!textype.isEmail(email)) {
		var e = new Error("Invalid e-mail");
		e.code = 1;
		return cb(e);
	}

	// check exist
	var collection = this.db.collection('Users');
	collection.find({email: email, key: {$exists: true}}).toArray(function (e, d) {
		if(e) { return cb(e); }
		else if(d.length > 0) {
			e = new Error("Exist account");
			e.code = 2;
			return cb(e);
		}

		// create account
		var code = dvalue.randomID(8);
		var user = {
			email: email,
			password: password,
			code: code,
			create: new Date().getTime()
		};
		collection.insertMany([user], function (err, result) {
			console.log(err);
			console.log(result);
			self.sendValidCode(email, code, function () {});
			// send valid code e-mail
		});
	});
};
/* require: email code */
Bot.prototype.sendValidCode = function (email, code, cb) {
	var template = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>iSunCloud</title></head><body style="margin: 0px;  font-family: Trebuchet MS, sans-serif, Helvetica, Microsoft JhengHei;  font-size: .8em;color: #332e3c;"><div style="width: 500px;margin: 10px auto;padding: 10px;border-radius: 5px;background: #E8DCB9;text-align: center;"><div style="font-size: 2em;text-align: center;">Welcome to iSunCloud</div><div><div style="margin-top: 20px;">valid code:</div><div style="color: #885533;font-size: 1.5em;">%s</div><a style="margin-top: 50px;font-size: 1.5em;line-height: 2em;color: #ffffff;background-color: #7798AB;border-radius: 5px;padding: 10px;display: block;" href="%s">Click to Verify Your Account</a></div><div>Not you? Please disregard this email.</div></div></body></html>';
	var link = encodeURIComponent(sprintf('http://laria.space/verify?email=%s&code=%s', email, code));
	var content = sprintf(template, code, link);
	var bot = this.getBot("Mailer");
	bot.send(email, content, cb);
};

/* email, code */
Bot.prototype.verify = function () {
	// verify
	// generateKey
	// delete account not verify data
};
/* email, password(md5) */
Bot.prototype.login = function () {};
/* token, refreshToken */
Bot.prototype.renew = function () {};
/* token */
Bot.prototype.logout = function () {};

module.exports = Bot;
