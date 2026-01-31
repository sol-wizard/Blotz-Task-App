"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.getBuildPath = getBuildPath;
function _cliTools() {
  const data = require("@react-native-community/cli-tools");
  _cliTools = function () {
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
function _fs() {
  const data = _interopRequireDefault(require("fs"));
  _fs = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
async function getBuildPath(buildSettings, platform = 'ios', isCatalyst = false) {
  let targetBuildDir = buildSettings.TARGET_BUILD_DIR;
  const executableFolderPath = buildSettings.EXECUTABLE_FOLDER_PATH;
  const fullProductName = buildSettings.FULL_PRODUCT_NAME;
  if (!targetBuildDir) {
    throw new (_cliTools().CLIError)('Failed to get the target build directory.');
  }
  if (!executableFolderPath) {
    throw new (_cliTools().CLIError)('Failed to get the app name.');
  }
  if (!fullProductName) {
    throw new (_cliTools().CLIError)('Failed to get product name.');
  }

  // Default is platform == ios && isCatalyst == false
  let buildPath = _path().default.join(targetBuildDir, executableFolderPath);

  // platform == ios && isCatalyst == true needs build path suffix,
  // but this regresses from time to time with suffix present or not
  // so check - there may be one already, or we may need to add suffix
  if (platform === 'ios' && isCatalyst) {
    // make sure path has one and only one '-maccatalyst' suffix on end
    if (!targetBuildDir.match(/-maccatalyst$/)) {
      targetBuildDir = `${targetBuildDir}-maccatalyst`;
    }
    buildPath = _path().default.join(targetBuildDir, executableFolderPath);
  }

  // macOS gets the product name, not the executable folder path
  if (platform === 'macos') {
    buildPath = _path().default.join(targetBuildDir, fullProductName);
  }

  // Make sure the directory exists and fail fast vs silently failing
  if (!_fs().default.existsSync(targetBuildDir)) {
    throw new (_cliTools().CLIError)(`target build directory ${targetBuildDir} does not exist`);
  }
  return buildPath;
}

//# sourceMappingURL=getBuildPath.js.map