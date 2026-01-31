"use strict";

var _SettingsStore = _interopRequireDefault(require("./SettingsStore.js"));
function _interopRequireDefault(e) {
  return e && e.__esModule ? e : { default: e };
}
const path = require("path");
const util = require("util");
const { BrowserWindow, Menu, app, shell, ipcMain } = require("electron");
const appSettings = new _SettingsStore.default();
const windowMetadata = new WeakMap();
function handleLaunchArgs(argv) {
  const {
    values: { frontendUrl, windowKey },
  } = util.parseArgs({
    options: {
      frontendUrl: {
        type: "string",
      },
      windowKey: {
        type: "string",
      },
    },
    args: argv,
  });
  let frontendWindow = BrowserWindow.getAllWindows().find((window) => {
    const metadata = windowMetadata.get(window);
    if (!metadata) {
      return false;
    }
    return metadata.windowKey === windowKey;
  });
  if (frontendWindow) {
    if (frontendWindow.isVisible()) {
      frontendWindow.flashFrame(true);
      setTimeout(() => {
        frontendWindow.flashFrame(false);
      }, 1000);
    }
  } else {
    frontendWindow = new BrowserWindow({
      ...(getSavedWindowPosition(windowKey) ?? {
        width: 1200,
        height: 600,
      }),
      webPreferences: {
        partition: "persist:react-native-devtools",
        preload: require.resolve("./preload.js"),
      },
      icon: path.join(__dirname, "resources", "icon.png"),
    });
    frontendWindow.setMenuBarVisibility(false);
    setupWindowResizeListeners(frontendWindow, windowKey);
  }
  frontendWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return {
      action: "deny",
    };
  });
  frontendWindow.loadURL(frontendUrl);
  windowMetadata.set(frontendWindow, {
    windowKey,
  });
  if (process.platform === "darwin") {
    app.focus({
      steal: true,
    });
  }
  frontendWindow.focus();
}
function configureAppMenu() {
  const template = [
    ...(process.platform === "darwin"
      ? [
          {
            role: "appMenu",
          },
        ]
      : []),
    {
      role: "fileMenu",
    },
    {
      role: "editMenu",
    },
    {
      role: "viewMenu",
    },
    {
      role: "windowMenu",
    },
    {
      role: "help",
      submenu: [
        {
          label: "React Native Website",
          click: () => shell.openExternal("https://reactnative.dev"),
        },
        {
          label: "Release Notes",
          click: () =>
            shell.openExternal(
              "https://github.com/facebook/react-native/releases",
            ),
        },
      ],
    },
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}
function getSavedWindowPosition(windowKey) {
  return appSettings.get("windowArrangements", {})[windowKey];
}
function saveWindowPosition(windowKey, position) {
  const windowArrangements = appSettings.get("windowArrangements", {});
  windowArrangements[windowKey] = position;
  appSettings.set("windowArrangements", windowArrangements);
}
function setupWindowResizeListeners(browserWindow, windowKey) {
  const savePosition = () => {
    if (!browserWindow.isDestroyed()) {
      const [x, y] = browserWindow.getPosition();
      const [width, height] = browserWindow.getSize();
      saveWindowPosition(windowKey, {
        x,
        y,
        width,
        height,
      });
    }
  };
  browserWindow.on("moved", savePosition);
  browserWindow.on("resized", savePosition);
  browserWindow.on("closed", savePosition);
}
app.whenReady().then(() => {
  handleLaunchArgs(process.argv.slice(app.isPackaged ? 1 : 2));
  configureAppMenu();
  app.on(
    "second-instance",
    (event, electronArgv, workingDirectory, additionalData) => {
      handleLaunchArgs(additionalData.argv);
    },
  );
});
app.on("window-all-closed", function () {
  app.quit();
});
ipcMain.on("bringToFront", (event, title) => {
  const webContents = event.sender;
  const win = BrowserWindow.fromWebContents(webContents);
  if (win) {
    win.focus();
  }
  if (process.platform === "darwin") {
    app.focus({
      steal: true,
    });
  }
});
