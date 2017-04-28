#!/usr/bin/env node
const startServer = require('../utils/startServer');

const start = async function start() {
    console.log(1);
    // initial folders
    // const folders = await utils.initialFolders();

    // load config
    // const config = await utils.loadConfig({folders});

    // start koa
    console.log(2);
    await startServer();
    console.log(3);
    // register path
};
start().catch((e) => {
    console.log(e);
});
