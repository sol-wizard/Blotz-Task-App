/* eslint-disable @typescript-eslint/no-require-imports */
const { withGradleProperties } = require("@expo/config-plugins");

module.exports = function withCustomGradleProperties(config) {
  return withGradleProperties(config, (config) => {
    const props = config.modResults; // Array<{ type: 'comment'|'property', key?: string, value?: string }>

    const setProp = (key, value) => {
      const existing = props.find((p) => p.type === "property" && p.key === key);
      if (existing) {
        existing.value = value;
      } else {
        props.push({ type: "property", key, value });
      }
    };

    // ✅ Ensure these Gradle properties exist (and override if already present)
    setProp("org.gradle.jvmargs", "-Xmx4096m -XX:MaxMetaspaceSize=512m");
    setProp("android.enableJetifier", "true");
    setProp("org.gradle.daemon", "true");
    setProp("org.gradle.parallel", "true");
    setProp("org.gradle.configureondemand", "true");

    return config;
  });
};
