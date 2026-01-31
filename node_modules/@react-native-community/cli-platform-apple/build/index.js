"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "createBuild", {
  enumerable: true,
  get: function () {
    return _createBuild.default;
  }
});
Object.defineProperty(exports, "createLog", {
  enumerable: true,
  get: function () {
    return _createLog.default;
  }
});
Object.defineProperty(exports, "createRun", {
  enumerable: true,
  get: function () {
    return _createRun.default;
  }
});
Object.defineProperty(exports, "findPbxprojFile", {
  enumerable: true,
  get: function () {
    return _cliConfigApple().findPbxprojFile;
  }
});
Object.defineProperty(exports, "findPodfilePaths", {
  enumerable: true,
  get: function () {
    return _cliConfigApple().findPodfilePaths;
  }
});
Object.defineProperty(exports, "findXcodeProject", {
  enumerable: true,
  get: function () {
    return _cliConfigApple().findXcodeProject;
  }
});
Object.defineProperty(exports, "getArchitecture", {
  enumerable: true,
  get: function () {
    return _getArchitecture.default;
  }
});
Object.defineProperty(exports, "getBuildOptions", {
  enumerable: true,
  get: function () {
    return _buildOptions.getBuildOptions;
  }
});
Object.defineProperty(exports, "getDependencyConfig", {
  enumerable: true,
  get: function () {
    return _cliConfigApple().getDependencyConfig;
  }
});
Object.defineProperty(exports, "getLogOptions", {
  enumerable: true,
  get: function () {
    return _logOptions.getLogOptions;
  }
});
Object.defineProperty(exports, "getProjectConfig", {
  enumerable: true,
  get: function () {
    return _cliConfigApple().getProjectConfig;
  }
});
Object.defineProperty(exports, "getRunOptions", {
  enumerable: true,
  get: function () {
    return _runOptions.getRunOptions;
  }
});
Object.defineProperty(exports, "installPods", {
  enumerable: true,
  get: function () {
    return _cliConfigApple().installPods;
  }
});
function _cliConfigApple() {
  const data = require("@react-native-community/cli-config-apple");
  _cliConfigApple = function () {
    return data;
  };
  return data;
}
var _buildOptions = require("./commands/buildCommand/buildOptions");
var _logOptions = require("./commands/logCommand/logOptions");
var _runOptions = require("./commands/runCommand/runOptions");
var _createBuild = _interopRequireDefault(require("./commands/buildCommand/createBuild"));
var _createLog = _interopRequireDefault(require("./commands/logCommand/createLog"));
var _createRun = _interopRequireDefault(require("./commands/runCommand/createRun"));
var _getArchitecture = _interopRequireDefault(require("./tools/getArchitecture"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//# sourceMappingURL=index.js.map