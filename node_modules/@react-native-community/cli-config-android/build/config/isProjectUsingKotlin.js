"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = isProjectUsingKotlin;
var _findPackageClassName = require("./findPackageClassName");
function isProjectUsingKotlin(sourceDir) {
  const mainActivityFiles = (0, _findPackageClassName.getMainActivityFiles)(sourceDir, false);
  return mainActivityFiles.some(file => file.endsWith('.kt'));
}

//# sourceMappingURL=isProjectUsingKotlin.js.map