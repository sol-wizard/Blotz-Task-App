"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.runOnDevice = runOnDevice;
function _child_process() {
  const data = _interopRequireDefault(require("child_process"));
  _child_process = function () {
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
var _buildProject = require("../buildCommand/buildProject");
var _getBuildPath = require("./getBuildPath");
var _getBuildSettings = require("./getBuildSettings");
var _installApp = _interopRequireDefault(require("./installApp"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
async function runOnDevice(selectedDevice, platform, mode, scheme, xcodeProject, args) {
  if (args.binaryPath && selectedDevice.type === 'catalyst') {
    throw new (_cliTools().CLIError)('binary-path was specified for catalyst device, which is not supported.');
  }
  if (selectedDevice.type === 'catalyst') {
    const buildOutput = await (0, _buildProject.buildProject)(xcodeProject, platform, selectedDevice.udid, mode, scheme, args);
    const buildSettings = await (0, _getBuildSettings.getBuildSettings)(xcodeProject, mode, buildOutput, scheme);
    if (!buildSettings) {
      throw new (_cliTools().CLIError)('Failed to get build settings for your project');
    }
    const appPath = await (0, _getBuildPath.getBuildPath)(buildSettings, platform, true);
    const appProcess = _child_process().default.spawn(`${appPath}/${scheme}`, [], {
      detached: true,
      stdio: 'ignore'
    });
    appProcess.unref();
  } else {
    const {
      binaryPath,
      target
    } = args;
    let buildOutput;
    if (!binaryPath) {
      buildOutput = await (0, _buildProject.buildProject)(xcodeProject, platform, selectedDevice.udid, mode, scheme, args);
    }
    _cliTools().logger.info(`Installing and launching your app on ${selectedDevice.name}`);
    (0, _installApp.default)({
      buildOutput: buildOutput ?? '',
      xcodeProject,
      mode,
      scheme,
      target,
      udid: selectedDevice.udid,
      binaryPath,
      isSimulator: false
    });
  }
  return _cliTools().logger.success('Installed the app on the device.');
}

//# sourceMappingURL=runOnDevice.js.map