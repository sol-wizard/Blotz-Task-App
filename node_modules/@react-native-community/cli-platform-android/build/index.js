"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "adb", {
  enumerable: true,
  get: function () {
    return _runAndroid.adb;
  }
});
Object.defineProperty(exports, "commands", {
  enumerable: true,
  get: function () {
    return _commands.default;
  }
});
Object.defineProperty(exports, "dependencyConfig", {
  enumerable: true,
  get: function () {
    return _cliConfigAndroid().dependencyConfig;
  }
});
Object.defineProperty(exports, "getAdbPath", {
  enumerable: true,
  get: function () {
    return _runAndroid.getAdbPath;
  }
});
Object.defineProperty(exports, "getAndroidProject", {
  enumerable: true,
  get: function () {
    return _cliConfigAndroid().getAndroidProject;
  }
});
Object.defineProperty(exports, "getPackageName", {
  enumerable: true,
  get: function () {
    return _cliConfigAndroid().getPackageName;
  }
});
Object.defineProperty(exports, "isProjectUsingKotlin", {
  enumerable: true,
  get: function () {
    return _cliConfigAndroid().isProjectUsingKotlin;
  }
});
Object.defineProperty(exports, "listAndroidDevices", {
  enumerable: true,
  get: function () {
    return _runAndroid.listAndroidDevices;
  }
});
Object.defineProperty(exports, "projectConfig", {
  enumerable: true,
  get: function () {
    return _cliConfigAndroid().projectConfig;
  }
});
Object.defineProperty(exports, "tryRunAdbReverse", {
  enumerable: true,
  get: function () {
    return _runAndroid.tryRunAdbReverse;
  }
});
var _commands = _interopRequireDefault(require("./commands"));
var _runAndroid = require("./commands/runAndroid");
function _cliConfigAndroid() {
  const data = require("@react-native-community/cli-config-android");
  _cliConfigAndroid = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//# sourceMappingURL=index.js.map