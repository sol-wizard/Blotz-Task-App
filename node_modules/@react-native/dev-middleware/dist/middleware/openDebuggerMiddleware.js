"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true,
});
exports.default = openDebuggerMiddleware;
var _getDevToolsFrontendUrl = _interopRequireDefault(
  require("../utils/getDevToolsFrontendUrl"),
);
var _crypto = require("crypto");
var _url = _interopRequireDefault(require("url"));
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
const LEGACY_SYNTHETIC_PAGE_TITLE =
  "React Native Experimental (Improved Chrome Reloads)";
function openDebuggerMiddleware({
  serverBaseUrl,
  logger,
  browserLauncher,
  eventReporter,
  experiments,
  inspectorProxy,
}) {
  let shellPreparationPromise;
  if (experiments.enableStandaloneFuseboxShell) {
    shellPreparationPromise =
      browserLauncher?.unstable_prepareFuseboxShell?.() ??
      Promise.resolve({
        code: "not_implemented",
      });
    shellPreparationPromise = shellPreparationPromise.then((result) => {
      eventReporter?.logEvent({
        type: "fusebox_shell_preparation_attempt",
        result,
      });
      return result;
    });
  }
  return async (req, res, next) => {
    if (
      req.method === "POST" ||
      (experiments.enableOpenDebuggerRedirect && req.method === "GET")
    ) {
      const parsedUrl = _url.default.parse(req.url, true);
      const query = parsedUrl.query;
      const targets = inspectorProxy
        .getPageDescriptions({
          requestorRelativeBaseUrl: new URL(serverBaseUrl),
        })
        .filter((app) => {
          const betterReloadingSupport =
            app.title === LEGACY_SYNTHETIC_PAGE_TITLE ||
            app.reactNative.capabilities?.nativePageReloads === true;
          if (!betterReloadingSupport) {
            logger?.warn(
              "Ignoring DevTools app debug target for '%s' with title '%s' and 'nativePageReloads' capability set to '%s'. ",
              app.appId,
              app.title,
              String(app.reactNative.capabilities?.nativePageReloads),
            );
          }
          return betterReloadingSupport;
        });
      let target;
      const launchType = req.method === "POST" ? "launch" : "redirect";
      if (
        typeof query.target === "string" ||
        typeof query.appId === "string" ||
        typeof query.device === "string"
      ) {
        logger?.info(
          (launchType === "launch" ? "Launching" : "Redirecting to") +
            " DevTools...",
        );
        target = targets.find(
          (_target) =>
            (query.target == null || _target.id === query.target) &&
            (query.appId == null ||
              (_target.appId === query.appId &&
                _target.title === LEGACY_SYNTHETIC_PAGE_TITLE)) &&
            (query.device == null ||
              _target.reactNative.logicalDeviceId === query.device),
        );
      } else if (targets.length > 0) {
        logger?.info(
          (launchType === "launch" ? "Launching" : "Redirecting to") +
            ` DevTools${targets.length === 1 ? "" : " for most recently connected target"}...`,
        );
        target = targets[targets.length - 1];
      }
      if (!target) {
        res.writeHead(404);
        res.end("Unable to find debugger target");
        logger?.warn(
          "No compatible apps connected. React Native DevTools can only be used with the Hermes engine.",
        );
        eventReporter?.logEvent({
          type: "launch_debugger_frontend",
          launchType,
          status: "coded_error",
          errorCode: "NO_APPS_FOUND",
        });
        return;
      }
      const useFuseboxEntryPoint =
        target.reactNative.capabilities?.prefersFuseboxFrontend ?? false;
      try {
        switch (launchType) {
          case "launch": {
            const frontendUrl = (0, _getDevToolsFrontendUrl.default)(
              experiments,
              target.webSocketDebuggerUrl,
              serverBaseUrl,
              {
                launchId: query.launchId,
                telemetryInfo: query.telemetryInfo,
                appId: target.appId,
                useFuseboxEntryPoint,
                panel: query.panel,
              },
            );
            let shouldUseStandaloneFuseboxShell =
              useFuseboxEntryPoint && experiments.enableStandaloneFuseboxShell;
            if (shouldUseStandaloneFuseboxShell) {
              const shellPreparationResult = await shellPreparationPromise;
              switch (shellPreparationResult.code) {
                case "success":
                case "not_implemented":
                  break;
                case "platform_not_supported":
                case "possible_corruption":
                case "likely_offline":
                case "unexpected_error":
                  shouldUseStandaloneFuseboxShell = false;
                  break;
                default:
                  shellPreparationResult.code;
              }
            }
            if (shouldUseStandaloneFuseboxShell) {
              const windowKey = (0, _crypto.createHash)("sha256")
                .update(
                  [
                    serverBaseUrl,
                    target.webSocketDebuggerUrl,
                    target.appId,
                  ].join("-"),
                )
                .digest("hex");
              if (!browserLauncher.unstable_showFuseboxShell) {
                throw new Error(
                  "Fusebox shell is not supported by the current browser launcher",
                );
              }
              await browserLauncher.unstable_showFuseboxShell(
                frontendUrl,
                windowKey,
              );
            } else {
              await browserLauncher.launchDebuggerAppWindow(frontendUrl);
            }
            res.writeHead(200);
            res.end();
            break;
          }
          case "redirect":
            res.writeHead(302, {
              Location: (0, _getDevToolsFrontendUrl.default)(
                experiments,
                target.webSocketDebuggerUrl,
                serverBaseUrl,
                {
                  relative: true,
                  launchId: query.launchId,
                  telemetryInfo: query.telemetryInfo,
                  appId: target.appId,
                  useFuseboxEntryPoint,
                },
              ),
            });
            res.end();
            break;
          default:
        }
        eventReporter?.logEvent({
          type: "launch_debugger_frontend",
          launchType,
          status: "success",
          appId: target.appId,
          deviceId: target.reactNative.logicalDeviceId,
          pageId: target.id,
          deviceName: target.deviceName,
          targetDescription: target.description,
          prefersFuseboxFrontend: useFuseboxEntryPoint,
        });
        return;
      } catch (e) {
        logger?.error(
          "Error launching DevTools: " + e.message ?? "Unknown error",
        );
        res.writeHead(500);
        res.end();
        eventReporter?.logEvent({
          type: "launch_debugger_frontend",
          launchType,
          status: "error",
          error: e,
          prefersFuseboxFrontend: useFuseboxEntryPoint,
        });
        return;
      }
    }
    next();
  };
}
