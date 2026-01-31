"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = openStackFrameMiddleware;
function _bodyParser() {
  const data = require("body-parser");
  _bodyParser = function () {
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
function _cliTools() {
  const data = require("@react-native-community/cli-tools");
  _cliTools = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Open a stack frame in the user's text editor.
 */
function openStackFrameMiddleware(_) {
  const handler = (req, res, next) => {
    if (req.method === 'POST') {
      if (req.body == null) {
        res.writeHead(400);
        res.end('Missing request body');
        return;
      }
      const frame = req.body;
      (0, _cliTools().launchEditor)(frame.file, frame.lineNumber);
      res.writeHead(200);
      res.end();
    }
    next();
  };
  return (0, _connect().default)().use((0, _bodyParser().json)()).use(handler);
}

//# sourceMappingURL=openStackFrameMiddleware.js.map