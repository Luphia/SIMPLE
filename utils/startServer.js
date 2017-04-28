const Koa = require('koa2');

const startServer = function startServer() {
    return new Promise((resolve) => {
        const app = new Koa();

        app.listen(80, () => {
            resolve();
        });
    });
};

module.exports = startServer;
