const Koa = require('koa2');

const startServer = () => {
	return new Promise((rsolve, reject) => {
		const app = new Koa();
		app.listen(3000);
		app.on('listening', () => {
			console.log(3000);
		})
	});
};
