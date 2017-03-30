const Router = require('./Router');

module.exports = Router;
module.exports.create = (opts) => new Router(opts);