"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.prepareDebuggerShellFromDotSlashFile =
  prepareDebuggerShellFromDotSlashFile;
exports.spawnAndGetStderr = spawnAndGetStderr;
const { spawn } = require("cross-spawn");
async function spawnAndGetStderr(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "ignore", "pipe"],
      encoding: "utf8",
      windowsHide: true,
    });
    let stderr = "";
    child.stderr.on("data", (data) => {
      stderr += data;
    });
    child.on("error", (error) => {
      reject(error);
    });
    child.on("close", (code, signal) => {
      resolve({
        code,
        stderr,
      });
    });
  });
}
async function prepareDebuggerShellFromDotSlashFile(filePath) {
  const { code, stderr } = await spawnAndGetStderr(require("fb-dotslash"), [
    "--",
    "fetch",
    filePath,
  ]);
  if (code === 0) {
    return {
      code: "success",
    };
  }
  if (
    stderr.includes("dotslash error") &&
    stderr.includes("no providers succeeded")
  ) {
    if (stderr.includes("failed to verify artifact")) {
      return {
        code: "possible_corruption",
        humanReadableMessage:
          "Failed to verify the latest version of React Native DevTools. " +
          "Using a fallback version instead. ",
        verboseInfo: stderr,
      };
    }
    return {
      code: "likely_offline",
      humanReadableMessage:
        "Failed to download the latest version of React Native DevTools. " +
        "Using a fallback version instead. " +
        "Connect to the internet or check your network settings.",
      verboseInfo: stderr,
    };
  }
  if (
    stderr.includes("dotslash error") &&
    stderr.includes("platform not supported")
  ) {
    return {
      code: "platform_not_supported",
      humanReadableMessage:
        "The latest version of React Native DevTools is not supported on this platform. " +
        "Using a fallback version instead.",
      verboseInfo: stderr,
    };
  }
  return {
    code: "unexpected_error",
    humanReadableMessage:
      "An unexpected error occured while installing the latest version of React Native DevTools. " +
      "Using a fallback version instead.",
    verboseInfo: stderr,
  };
}
