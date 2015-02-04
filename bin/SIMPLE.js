#!/usr/bin/env node

var fs = require('fs')
,	sub = 'js'
,	config = {}
,	reg = new RegExp('\.' + sub + '$')
,	folder = __dirname + "/../bots/"
,	files = fs.readdirSync(folder)
;

var Coordinator = require(folder + 'Coordinator.js');
var coordinator = new Coordinator();
coordinator.start();

for(var key in files) {
	if(reg.test(files[key]) && files[key].indexOf("_") == -1 && files[key] != 'Coordinator.js') {
		var BOT = require(folder + files[key]),
			bot = new BOT({"tags": [files[key]]});

		bot.start();
	}
}