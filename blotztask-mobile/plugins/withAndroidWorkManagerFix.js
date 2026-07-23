import { withProjectBuildGradle, createRunOncePlugin } from "expo/config-plugins";
const PLUGIN_NAME = "withAndroidWorkManagerFix";
const MARKER_START = "// @generated begin withAndroidWorkManagerFix";
const MARKER_END = "// @generated end withAndroidWorkManagerFix";

const gradlePatch = `
${MARKER_START}
allprojects {
  configurations.configureEach {
    exclude group: 'androidx.work', module: 'work-runtime-ktx'

    resolutionStrategy.eachDependency { details ->
      if (details.requested.group == 'androidx.work' && details.requested.name == 'work-runtime') {
        details.useVersion '2.8.1'
        details.because 'Use WorkManager runtime 2.8.1 and exclude old ktx module to avoid duplicate classes'
      }
    }
  }
}
${MARKER_END}
`;

const withAndroidWorkManagerFix = (config) => {
  return withProjectBuildGradle(config, (config) => {
    let contents = config.modResults.contents;

    const existingPatchRegex = new RegExp(`\\n?${MARKER_START}[\\s\\S]*?${MARKER_END}\\n?`, "g");

    contents = contents.replace(existingPatchRegex, "\n");

    const anchor = 'apply plugin: "expo-root-project"';

    if (contents.includes(anchor)) {
      contents = contents.replace(anchor, `${gradlePatch}\n${anchor}`);
    } else {
      contents = `${contents.trim()}\n\n${gradlePatch}\n`;
    }

    config.modResults.contents = contents;
    return config;
  });
};

module.exports = createRunOncePlugin(withAndroidWorkManagerFix, PLUGIN_NAME, "1.0.0");
