"use strict";

var _BuildInfo = _interopRequireDefault(require("./BuildInfo"));
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
const pkg = require("../../package.json");
const util = require("util");
const { app } = require("electron");
app.setName(pkg.productName ?? pkg.name);
app.setVersion(pkg.version + "-" + _BuildInfo.default.revision);
const {
  values: { version = false },
} = util.parseArgs({
  options: {
    version: {
      type: "boolean",
    },
  },
  args: process.argv.slice(app.isPackaged ? 1 : 2),
  strict: false,
});
if (version) {
  console.log(`${pkg.name} v${app.getVersion()}`);
  app.exit(0);
}
const gotTheLock = app.requestSingleInstanceLock({
  argv: process.argv.slice(app.isPackaged ? 1 : 2),
});
if (!gotTheLock) {
  app.quit();
} else {
  require("./MainInstanceEntryPoint.js");
}
