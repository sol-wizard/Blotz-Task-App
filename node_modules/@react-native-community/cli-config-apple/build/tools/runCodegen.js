"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
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
function _execa() {
  const data = _interopRequireDefault(require("execa"));
  _execa = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
async function runCodegen(options) {
  if (_fs().default.existsSync('build')) {
    _fs().default.rmSync('build', {
      recursive: true
    });
  }
  const codegenScript = _path().default.join(options.reactNativePath, 'scripts', 'generate-codegen-artifacts.js');
  await (0, _execa().default)('node', [codegenScript, '-p', options.root, '-o', options.iosFolderPath, '-t', options.platform]);
}
var _default = runCodegen;
exports.default = _default;

//# sourceMappingURL=runCodegen.js.map