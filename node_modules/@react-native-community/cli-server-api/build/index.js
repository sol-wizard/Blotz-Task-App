"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.createDevServerMiddleware = createDevServerMiddleware;
function _compression() {
  const data = _interopRequireDefault(require("compression"));
  _compression = function () {
    return data;
  };
  return data;
}
function _connect() {
  const data = _interopRequireDefault(require("connect"));
  _connect = function () {
    return data;
  };
  return data;
}
function _errorhandler() {
  const data = _interopRequireDefault(require("errorhandler"));
  _errorhandler = function () {
    return data;
  };
  return data;
}
function _nocache() {
  const data = _interopRequireDefault(require("nocache"));
  _nocache = function () {
    return data;
  };
  return data;
}
function _serveStatic() {
  const data = _interopRequireDefault(require("serve-static"));
  _serveStatic = function () {
    return data;
  };
  return data;
}
var _indexPageMiddleware = _interopRequireDefault(require("./indexPageMiddleware"));
var _openStackFrameMiddleware = _interopRequireDefault(require("./openStackFrameMiddleware"));
var _openURLMiddleware = _interopRequireDefault(require("./openURLMiddleware"));
var _securityHeadersMiddleware = _interopRequireDefault(require("./securityHeadersMiddleware"));
var _statusPageMiddleware = _interopRequireDefault(require("./statusPageMiddleware"));
var _systraceProfileMiddleware = _interopRequireDefault(require("./systraceProfileMiddleware"));
var _createMessageSocketEndpoint = _interopRequireDefault(require("./websocket/createMessageSocketEndpoint"));
var _createEventsSocketEndpoint = _interopRequireDefault(require("./websocket/createEventsSocketEndpoint"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function createDevServerMiddleware(options) {
  const messageSocketEndpoint = (0, _createMessageSocketEndpoint.default)();
  const broadcast = messageSocketEndpoint.broadcast;
  const eventsSocketEndpoint = (0, _createEventsSocketEndpoint.default)(broadcast);
  const middleware = (0, _connect().default)().use((0, _securityHeadersMiddleware.default)(options))
  // @ts-ignore compression and connect types mismatch
  .use((0, _compression().default)()).use((0, _nocache().default)()).use('/', _indexPageMiddleware.default).use('/open-stack-frame', (0, _openStackFrameMiddleware.default)(options)).use('/open-url', _openURLMiddleware.default).use('/status', _statusPageMiddleware.default)
  // @ts-ignore mismatch
  .use('/systrace', _systraceProfileMiddleware.default).use('/reload', (_req, res) => {
    broadcast('reload');
    res.end('OK');
  })
  // @ts-ignore mismatch
  .use((0, _errorhandler().default)());
  options.watchFolders.forEach(folder => {
    // @ts-ignore mismatch between express and connect middleware types
    middleware.use((0, _serveStatic().default)(folder));
  });
  return {
    websocketEndpoints: {
      '/message': messageSocketEndpoint.server,
      '/events': eventsSocketEndpoint.server
    },
    messageSocketEndpoint,
    eventsSocketEndpoint,
    middleware
  };
}

//# sourceMappingURL=index.js.map