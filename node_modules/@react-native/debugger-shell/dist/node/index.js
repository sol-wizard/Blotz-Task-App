"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.unstable_prepareDebuggerShell = unstable_prepareDebuggerShell;
exports.unstable_spawnDebuggerShellWithArgs =
  unstable_spawnDebuggerShellWithArgs;
var _LaunchUtils = require("./private/LaunchUtils");
const { spawn } = require("cross-spawn");
const path = require("path");
const DEVTOOLS_BINARY_DOTSLASH_FILE = path.join(
  __dirname,
  "../../bin/react-native-devtools",
);
async function unstable_spawnDebuggerShellWithArgs(
  args,
  { mode = "detached", flavor = "prebuilt", prebuiltBinaryPath } = {},
) {
  const [binaryPath, baseArgs] = getShellBinaryAndArgs(
    flavor,
    prebuiltBinaryPath,
  );
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [...baseArgs, ...args], {
      stdio: "inherit",
      windowsHide: true,
      detached: mode === "detached",
    });
    if (mode === "detached") {
      child.on("spawn", () => {
        resolve();
      });
      child.on("close", (code) => {
        if (code !== 0) {
          reject(
            new Error(
              `Failed to open debugger shell: exited with code ${code}`,
            ),
          );
        }
      });
      child.unref();
    } else if (mode === "syncThenExit") {
      child.on("close", function (code, signal) {
        if (code === null) {
          console.error("Debugger shell exited with signal", signal);
          process.exit(1);
        }
        process.exit(code);
      });
      const handleTerminationSignal = function (signal) {
        process.on(signal, function signalHandler() {
          if (!child.killed) {
            child.kill(signal);
          }
        });
      };
      handleTerminationSignal("SIGINT");
      handleTerminationSignal("SIGTERM");
    }
  });
}
async function unstable_prepareDebuggerShell(
  flavor,
  { prebuiltBinaryPath } = {},
) {
  try {
    switch (flavor) {
      case "prebuilt":
        const prebuiltResult = await (0,
        _LaunchUtils.prepareDebuggerShellFromDotSlashFile)(
          prebuiltBinaryPath ?? DEVTOOLS_BINARY_DOTSLASH_FILE,
        );
        if (prebuiltResult.code !== "success") {
          return prebuiltResult;
        }
        break;
      case "dev":
        break;
      default:
        throw new Error(`Unknown flavor: ${flavor}`);
    }
    const [binaryPath, baseArgs] = getShellBinaryAndArgs(
      flavor,
      prebuiltBinaryPath,
    );
    const { code, stderr } = await (0, _LaunchUtils.spawnAndGetStderr)(
      binaryPath,
      [...baseArgs, "--version"],
    );
    if (code !== 0) {
      return {
        code: "unexpected_error",
        verboseInfo: stderr,
      };
    }
    return {
      code: "success",
    };
  } catch (e) {
    return {
      code: "unexpected_error",
      verboseInfo: e.message,
    };
  }
}
function getShellBinaryAndArgs(flavor, prebuiltBinaryPath) {
  switch (flavor) {
    case "prebuilt":
      return [
        require("fb-dotslash"),
        [prebuiltBinaryPath ?? DEVTOOLS_BINARY_DOTSLASH_FILE],
      ];
    case "dev":
      return [require("electron"), [require.resolve("../electron")]];
    default:
      throw new Error(`Unknown flavor: ${flavor}`);
  }
}
