const debug = require('debug')('eqws-router');
const error = require('debug')('eqws-router:error');

const compose = require('koa-compose');
const Protocol = require('eqws-protocol');
const C = Protocol.C;
const ApiError = Protocol.ApiError;
const Context = require('./Context');

class Router {
	constructor(opts = {}) {
		this._methods = {};
		this._middlewares = [];
		this._options = opts;

		this.init = this.init.bind(this);
	}

	define(method, handler) {
		const route = {};

		if (arguments.length === 1 && 'object' === typeof method) {
			route = opts;
		} else if (arguments.length === 2) {
			route.path = method;
			route.handler = handler;
		} else if (arguments.length > 2) {
			let args = Array.prototype.slice.call(arguments);

			route.path = args.shift();
			route.handler = compose(args);
		} else {
			throw new Error('Invalid route define arguments');
		}

		debug('define method=%s', method);
		this._methods[method] = { handler };
	}

	init(wss, opts) {
		debug('open chanel');
		const controller = this._controller.bind(this);

		wss.on(`packet:${C.PACKET_TYPES.RPC}`, controller);
	}

	use(fn) {
		this._middlewares.push(fn);
	}

	match(path) {
		return this._methods[path];
	}

	_controller(socket, packet) {
		const ctx = new Context(socket, this._options);

		debug('socket=%s request=%j', socket.id, packet.data);

		try {
			ctx._parseRequest(packet.data);
		} catch (err) {
			error(err);
			return ctx._onError(err);
		}

		const route = this.match(ctx.path);

		if (!route) {
			error('method=%s not defined', ctx.path);

			let err = ApiError.incorrectMethod(ctx.path);
			return ctx._onError(err);
		}

		let way = this._middlewares.concat(route.handler);
		let fn = compose(way);

		debug('middlewares method=%s compose', ctx.path);

		fn(ctx)
			.then(ctx.send.bind(ctx))
			.catch(ctx._onError.bind(ctx));
	}
}

module.exports = Router;