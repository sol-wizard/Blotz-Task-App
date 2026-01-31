"use strict";

const { contextBridge, ipcRenderer } = require("electron");
contextBridge.executeInMainWorld({
  func: (ipcDevTools) => {
    let didDecorateInspectorFrontendHostInstance = false;
    globalThis.reactNativeDecorateInspectorFrontendHostInstance = (
      InspectorFrontendHostInstance,
    ) => {
      didDecorateInspectorFrontendHostInstance = true;
      InspectorFrontendHostInstance.bringToFront = () => {
        ipcDevTools.bringToFront();
      };
    };
    document.addEventListener("DOMContentLoaded", () => {
      if (!didDecorateInspectorFrontendHostInstance) {
        console.error(
          "reactNativeDecorateInspectorFrontendHostInstance was not called at startup. " +
            "This version of the DevTools frontend may not be compatible with @react-native/debugger-shell.",
        );
      }
    });
  },
  args: [
    {
      bringToFront() {
        ipcRenderer.send("bringToFront");
      },
    },
  ],
});
