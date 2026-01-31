"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _cliTools() {
  const data = require("@react-native-community/cli-tools");
  _cliTools = function () {
    return data;
  };
  return data;
}
var _getArchitecture = _interopRequireDefault(require("../../tools/getArchitecture"));
var _buildProject = require("./buildProject");
var _getConfiguration = require("./getConfiguration");
var _getXcodeProjectAndDir = require("./getXcodeProjectAndDir");
function _cliConfigApple() {
  const data = require("@react-native-community/cli-config-apple");
  _cliConfigApple = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const createBuild = ({
  platformName
}) => async (_, ctx, args) => {
  const platformConfig = ctx.project[platformName];
  if (platformConfig === undefined || _cliConfigApple().supportedPlatforms[platformName] === undefined) {
    throw new (_cliTools().CLIError)(`Unable to find ${platformName} platform config`);
  }
  let installedPods = false;
  if (platformConfig.automaticPodsInstallation || args.forcePods || args.onlyPods) {
    const isAppRunningNewArchitecture = platformConfig.sourceDir ? await (0, _getArchitecture.default)(platformConfig.sourceDir) : undefined;
    await (0, _cliConfigApple().resolvePods)(ctx.root, platformConfig.sourceDir, ctx.dependencies, platformName, ctx.reactNativePath, {
      forceInstall: args.forcePods || args.onlyPods,
      newArchEnabled: isAppRunningNewArchitecture
    });
    installedPods = true;
  }
  if (args.onlyPods) {
    return;
  }
  let {
    xcodeProject,
    sourceDir
  } = (0, _getXcodeProjectAndDir.getXcodeProjectAndDir)(platformConfig, platformName, installedPods);
  process.chdir(sourceDir);
  const {
    scheme,
    mode
  } = await (0, _getConfiguration.getConfiguration)(xcodeProject, sourceDir, args, platformName);
  return (0, _buildProject.buildProject)(xcodeProject, platformName, undefined, mode, scheme, args);
};
var _default = createBuild;
exports.default = _default;

//# sourceMappingURL=createBuild.js.map