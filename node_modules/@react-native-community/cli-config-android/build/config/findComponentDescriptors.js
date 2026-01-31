"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findComponentDescriptors = findComponentDescriptors;
function _fs() {
  const data = _interopRequireDefault(require("fs"));
  _fs = function () {
    return data;
  };
  return data;
}
function _path() {
  const data = _interopRequireDefault(require("path"));
  _path = function () {
    return data;
  };
  return data;
}
function _fastGlob() {
  const data = _interopRequireDefault(require("fast-glob"));
  _fastGlob = function () {
    return data;
  };
  return data;
}
var _extractComponentDescriptors = require("./extractComponentDescriptors");
function _cliTools() {
  const data = require("@react-native-community/cli-tools");
  _cliTools = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function findComponentDescriptors(packageRoot) {
  let jsSrcsDir = null;
  try {
    const packageJson = _fs().default.readFileSync(_path().default.join(packageRoot, 'package.json'), 'utf8');
    jsSrcsDir = JSON.parse(packageJson).codegenConfig.jsSrcsDir;
  } catch (error) {
    // no jsSrcsDir, continue with default glob pattern
  }
  const globPattern = jsSrcsDir ? `${jsSrcsDir}/**/*{.js,.jsx,.ts,.tsx}` : '**/*{.js,.jsx,.ts,.tsx}';
  const files = _fastGlob().default.sync(globPattern, {
    cwd: (0, _cliTools().unixifyPaths)(packageRoot),
    onlyFiles: true,
    ignore: ['**/node_modules/**']
  });
  const codegenComponent = files.map(filePath => _fs().default.readFileSync(_path().default.join(packageRoot, filePath), 'utf8')).map(_extractComponentDescriptors.extractComponentDescriptors).filter(Boolean);

  // Filter out duplicates as it happens that libraries contain multiple outputs due to package publishing.
  // TODO: consider using "codegenConfig" to avoid this.
  return Array.from(new Set(codegenComponent));
}

//# sourceMappingURL=findComponentDescriptors.js.map