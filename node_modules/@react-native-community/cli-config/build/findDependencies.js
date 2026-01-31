"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = findDependencies;
function _path() {
  const data = _interopRequireDefault(require("path"));
  _path = function () {
    return data;
  };
  return data;
}
function _fs() {
  const data = _interopRequireDefault(require("fs"));
  _fs = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Returns an array of dependencies from project's package.json
 */
function findDependencies(root) {
  let pjson;
  try {
    const content = _fs().default.readFileSync(_path().default.join(root, 'package.json'), 'utf8');
    pjson = JSON.parse(content);
  } catch (e) {
    return [];
  }
  const deps = new Set([...Object.keys(pjson.dependencies || {}), ...Object.keys(pjson.peerDependencies || {}), ...Object.keys(pjson.devDependencies || {})]);
  return Array.from(deps);
}

//# sourceMappingURL=findDependencies.js.map