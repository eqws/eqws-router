const debug    = require('debug')('eqws-router:ctx');
const Protocol = require('eqws-protocol');
const C        = Protocol.C;
const Packet   = Protocol.Packet;
const ApiError = Protocol.ApiError;

class Context {
	constructor(socket, opts = {}) {
		this._options = opts;
		this.socket   = socket;
		this.body     = null; // like koa style
		this.id       = null; // define when router parsed request
		this.route    = null; // define when router parsed request
		this.state    = {};
		this.payload  = {};
		this.respond  = false;
		this.lifettl  = Date.now();
	}

	throw(code, msg) {
		throw new ApiError(code, msg);
	}

	send() {
		if (this.respond) {
			throw new Error('Allready responded');
		}

		const response = [this.id, this.path, {
			response: this.body,
			ms: this.lifeTime()
		}];

		debug('response socket=%s response=%j', this.socket.id, response);

		const packet = new Packet(C.PACKET_TYPES.RPC, response);
		this.socket._sendPacket(packet);
	}

	lifeTime() {
		return Date.now() - this.lifettl;
	}

	errorHandler(err) {
		if (typeof err === 'number') {
			err = new ApiError(err);
		}

		this.body = {
			error_code: err.code || 500,
			error_msg: err.toString(),
			id: this.id
		};
	}

	_parseRequest(args) {
		const handshakeData = this.socket.getHandshakeData();
		const headers       = handshakeData.headers || {};

		this.id   = args[0];
		this.path = args[1];
		this.url  = args[1];
		this.originalUrl = args[1];

		this.request = {
			protocol: 'ws',
			path: args[1],
			body: args[2],
			ip: handshakeData.remoteAddress,
			headers: headers
		};
	}

	_onError(err) {
		this.errorHandler(err);
		this.send();
	}
}

module.exports = Context;