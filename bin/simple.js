#!/usr/bin/env node
const utils = require('../utils');

const start = async function start() {
    // initial folders
    // const folders = await utils.initialFolders();

    // load config
    // const config = await utils.loadConfig({folders});

    // start koa
    utils.startServer();

    // register path
};
start();
