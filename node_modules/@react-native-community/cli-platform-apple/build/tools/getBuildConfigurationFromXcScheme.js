"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBuildConfigurationFromXcScheme = getBuildConfigurationFromXcScheme;
function _cliTools() {
  const data = require("@react-native-community/cli-tools");
  _cliTools = function () {
    return data;
  };
  return data;
}
function _picocolors() {
  const data = _interopRequireDefault(require("picocolors"));
  _picocolors = function () {
    return data;
  };
  return data;
}
function _fastXmlParser() {
  const data = require("fast-xml-parser");
  _fastXmlParser = function () {
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
function _path() {
  const data = _interopRequireDefault(require("path"));
  _path = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const xmlParser = new (_fastXmlParser().XMLParser)({
  ignoreAttributes: false
});
function getBuildConfigurationFromXcScheme(scheme, configuration, sourceDir, projectInfo) {
  // can not assume .xcodeproj exists.
  // for more info see: https://github.com/react-native-community/cli/pull/2196
  try {
    const xcProject = _fs().default.readdirSync(sourceDir).find(dir => dir.endsWith('.xcodeproj'));
    if (xcProject) {
      const xmlScheme = _fs().default.readFileSync(_path().default.join(sourceDir, xcProject, 'xcshareddata', 'xcschemes', `${scheme}.xcscheme`), {
        encoding: 'utf-8'
      });
      const {
        Scheme
      } = xmlParser.parse(xmlScheme);
      return Scheme.LaunchAction['@_buildConfiguration'];
    }
  } catch {
    const projectSchemes = (projectInfo === null || projectInfo === void 0 ? void 0 : projectInfo.schemes) && projectInfo.schemes.length > 0 ? `${projectInfo.schemes.map(name => _picocolors().default.bold(name)).join(', ')}` : 'No schemes';
    throw new (_cliTools().CLIError)(`Could not load the shared scheme for ${scheme}. Your project configuration includes: ${projectSchemes}. Please ensure a valid .xcscheme file exists in xcshareddata/xcschemes.`);
  }
  return configuration;
}

//# sourceMappingURL=getBuildConfigurationFromXcScheme.js.map