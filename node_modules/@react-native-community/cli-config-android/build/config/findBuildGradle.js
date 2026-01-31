"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.findBuildGradle = findBuildGradle;
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
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Find the build.gradle file for the given app name.
 * This helper is used to find build.gradle file in both apps and libraries.
 * For libraries, the appName is empty string.
 */
function findBuildGradle(sourceDir, appName) {
  const buildGradlePath = _path().default.join(sourceDir, _path().default.join(appName, 'build.gradle'));
  const buildGradleKtsPath = _path().default.join(sourceDir, _path().default.join(appName, 'build.gradle.kts'));
  if (_fs().default.existsSync(buildGradlePath)) {
    return buildGradlePath;
  } else if (_fs().default.existsSync(buildGradleKtsPath)) {
    return buildGradleKtsPath;
  } else {
    return null;
  }
}

//# sourceMappingURL=findBuildGradle.js.map