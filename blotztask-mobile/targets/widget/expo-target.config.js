/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  icon: "https://github.com/expo.png",
  entitlements: {
    "com.apple.security.application-groups": [`group.${config.ios.bundleIdentifier}.widget`],
  },
  colors: {
    $widgetBackground: "#F5F9FA",
    $accent: "#D1D1D6",
  },
});
