/* eslint-disable @typescript-eslint/no-require-imports */
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");

const fs = require("fs");
const path = require("path");

const APP_PACKAGE = "com.blotz.blotztask";
const APP_PACKAGE_PATH = APP_PACKAGE.split(".");

const SPEECH_DEP = 'implementation "com.microsoft.cognitiveservices.speech:client-sdk:1.37.0"';

// ---------- utils ----------
function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  fs.mkdirSync(destDir, { recursive: true });

  for (const entry of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, entry);
    const dest = path.join(destDir, entry);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) copyDir(src, dest);
    else fs.copyFileSync(src, dest);
  }
}

function ensureImport(mainAppText, importLine) {
  if (mainAppText.includes(importLine)) return mainAppText;

  const importRegex = /^import .+$/gm;
  const imports = mainAppText.match(importRegex);
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    return mainAppText.replace(lastImport, `${lastImport}\n${importLine}`);
  }

  const pkgLine = `package ${APP_PACKAGE}`;
  if (mainAppText.includes(pkgLine)) {
    return mainAppText.replace(pkgLine, `${pkgLine}\n\n${importLine}`);
  }

  return `${importLine}\n${mainAppText}`;
}

function ensurePackagesAddLine(mainAppText, addLine) {
  if (mainAppText.includes(addLine)) return mainAppText;

  const xfLine = "packages.add(XfIatPackage())";
  if (mainAppText.includes(xfLine)) {
    return mainAppText.replace(xfLine, `${xfLine}\n            ${addLine}`);
  }

  const returnRegex = /return packages/;
  if (returnRegex.test(mainAppText)) {
    return mainAppText.replace(returnRegex, `            ${addLine}\n            return packages`);
  }

  throw new Error("Could not find insertion point in getPackages() to add AzureSpeechPackage()");
}

// ---------- plugin ----------
function withAzureSpeechAndroid(config) {
  // 1) Ensure mavenCentral() in root project build.gradle
  config = withProjectBuildGradle(config, (cfg) => {
    let content = cfg.modResults.contents;

    if (!content.includes("mavenCentral()")) {
      content = content.replace(/repositories\s*{/, "repositories {\n        mavenCentral()");
    }

    cfg.modResults.contents = content;
    return cfg;
  });

  // 2) Add Azure Speech dependency + proguard include to app/build.gradle
  config = withAppBuildGradle(config, (cfg) => {
    let content = cfg.modResults.contents;

    if (!content.includes("com.microsoft.cognitiveservices.speech:client-sdk")) {
      content = content.replace(/dependencies\s*{/, `dependencies {\n    ${SPEECH_DEP}\n`);
    }

    if (!content.includes("azure-speech-proguard.pro")) {
      content = content.replace(
        /proguardFiles\s+getDefaultProguardFile\(['"]proguard-android-optimize\.txt['"]\),\s*['"]proguard-rules\.pro['"]/,
        (m) => `${m}, 'azure-speech-proguard.pro'`,
      );
    }

    cfg.modResults.contents = content;
    return cfg;
  });

  // 3) Dangerous mod: copy native code & patch MainApplication.kt
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const androidMainJava = path.join(projectRoot, "android", "app", "src", "main", "java");

      const srcNative = path.join(projectRoot, "plugins", "azure-speech-android");
      const destNative = path.join(androidMainJava, ...APP_PACKAGE_PATH, "azurespeech");

      copyDir(srcNative, destNative);

      const proguardSrc = path.join(srcNative, "proguard-rules.pro");
      const proguardDest = path.join(projectRoot, "android", "app", "azure-speech-proguard.pro");
      if (fs.existsSync(proguardSrc)) {
        fs.copyFileSync(proguardSrc, proguardDest);
      }

      const mainApplicationPath = path.join(
        androidMainJava,
        ...APP_PACKAGE_PATH,
        "MainApplication.kt",
      );
      if (!fs.existsSync(mainApplicationPath)) {
        throw new Error(`MainApplication.kt not found at ${mainApplicationPath}`);
      }

      let mainAppText = fs.readFileSync(mainApplicationPath, "utf8");

      const importLine = `import ${APP_PACKAGE}.azurespeech.AzureSpeechPackage`;
      mainAppText = ensureImport(mainAppText, importLine);

      const addLine = "packages.add(AzureSpeechPackage())";
      mainAppText = ensurePackagesAddLine(mainAppText, addLine);

      fs.writeFileSync(mainApplicationPath, mainAppText, "utf8");

      return cfg;
    },
  ]);

  return config;
}

module.exports = withAzureSpeechAndroid;
