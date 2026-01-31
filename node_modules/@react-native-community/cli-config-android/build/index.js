"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
Object.defineProperty(exports, "dependencyConfig", {
  enumerable: true,
  get: function () {
    return _config.dependencyConfig;
  }
});
Object.defineProperty(exports, "getAndroidProject", {
  enumerable: true,
  get: function () {
    return _getAndroidProject.getAndroidProject;
  }
});
Object.defineProperty(exports, "getPackageName", {
  enumerable: true,
  get: function () {
    return _getAndroidProject.getPackageName;
  }
});
Object.defineProperty(exports, "isProjectUsingKotlin", {
  enumerable: true,
  get: function () {
    return _isProjectUsingKotlin.default;
  }
});
Object.defineProperty(exports, "projectConfig", {
  enumerable: true,
  get: function () {
    return _config.projectConfig;
  }
});
var _config = require("./config");
var _getAndroidProject = require("./config/getAndroidProject");
var _isProjectUsingKotlin = _interopRequireDefault(require("./config/isProjectUsingKotlin"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

//# sourceMappingURL=index.js.map