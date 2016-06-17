const fs = require('fs');
const dvalue = require('dvalue');

var defaultConfig = {};
var customConfig = {};
try { customConfig = require('./config.js'); } catch(e) {}
var config = dvalue.default(customConfig, defaultConfig);

module.exports = config;
