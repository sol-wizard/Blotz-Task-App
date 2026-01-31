"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.default = void 0;
const {
  unstable_prepareDebuggerShell,
  unstable_spawnDebuggerShellWithArgs,
} = require("@react-native/debugger-shell");
const { spawn } = require("child_process");
const ChromeLauncher = require("chrome-launcher");
const { Launcher: EdgeLauncher } = require("chromium-edge-launcher");
const open = require("open");
const DefaultBrowserLauncher = {
  launchDebuggerAppWindow: async (url) => {
    let chromePath;
    try {
      chromePath = ChromeLauncher.getChromePath();
    } catch (e) {
      chromePath = EdgeLauncher.getFirstInstallation();
    }
    if (chromePath == null) {
      await open(url);
      return;
    }
    const chromeFlags = [`--app=${url}`, "--window-size=1200,600"];
    return new Promise((resolve, reject) => {
      const childProcess = spawn(chromePath, chromeFlags, {
        detached: true,
        stdio: "ignore",
      });
      childProcess.on("data", () => {
        resolve();
      });
      childProcess.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Failed to launch debugger app window: ${chromePath} exited with code ${code}`,
            ),
          );
        }
      });
    });
  },
  async unstable_showFuseboxShell(url, windowKey) {
    return await unstable_spawnDebuggerShellWithArgs(
      ["--frontendUrl=" + url, "--windowKey=" + windowKey],
      {
        mode: "detached",
        flavor: process.env.RNDT_DEV === "1" ? "dev" : "prebuilt",
      },
    );
  },
  async unstable_prepareFuseboxShell() {
    return await unstable_prepareDebuggerShell(
      process.env.RNDT_DEV === "1" ? "dev" : "prebuilt",
    );
  },
};
var _default = (exports.default = DefaultBrowserLauncher);
