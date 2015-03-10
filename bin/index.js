#!/usr/bin/env node

var fs = require('fs')
,	sub = 'js'
,	config = {}
,	reg = new RegExp('\.' + sub + '$')
,	folder = __dirname + "/../bots/"
,	files = fs.readdirSync(folder)
;

var skip = ["Coordinator.js", "Receptor.js"];
var Coordinator = require(folder + 'Coordinator.js');
var Receptor = require(folder + 'Receptor.js');
var coordinator = new Coordinator();
var receptor = new Receptor();
coordinator.start();
receptor.start();

for(var key in files) {
	if(reg.test(files[key]) && files[key].indexOf("_") == -1 && skip.indexOf(files[key]) == -1 ) {
		var BOT = require(folder + files[key])
		,	tag
		,	tagArr = files[key].split(".")
		,	bot = new BOT();

		tagArr.pop();
		tag = tagArr.join(".");
		bot.tag(tag);
		bot.name = tag;

		receptor.addController(bot);

		bot.start();

		receptor
	}
}