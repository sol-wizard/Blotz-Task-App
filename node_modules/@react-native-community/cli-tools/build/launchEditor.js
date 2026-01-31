"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = launchEditor;
function _launchEditor() {
  const data = _interopRequireDefault(require("launch-editor"));
  _launchEditor = function () {
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
 *
 * @format
 */

function launchEditor(fileName, lineNumber, _watchFolders) {
  (0, _launchEditor().default)(`${fileName}:${lineNumber}`, process.env.REACT_EDITOR);
}

//# sourceMappingURL=launchEditor.js.map