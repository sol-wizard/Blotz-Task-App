import {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
} from "@expo/config-plugins";
import fs from "fs";
import path from "path";

const APP_PACKAGE = "com.blotz.blotztask";
const APP_PACKAGE_PATH = APP_PACKAGE.split("."); // ["com","blotz","blotztask"]

const SPEECH_DEP = `implementation "com.microsoft.cognitiveservices.speech:client-sdk:1.37.0"`;

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

  // Insert after the last existing import line if possible
  const importRegex = /^import .+$/gm;
  const imports = mainAppText.match(importRegex);
  if (imports && imports.length > 0) {
    const lastImport = imports[imports.length - 1];
    return mainAppText.replace(lastImport, `${lastImport}\n${importLine}`);
  }

  // Fallback: insert after package declaration
  const pkgLine = `package ${APP_PACKAGE}`;
  if (mainAppText.includes(pkgLine)) {
    return mainAppText.replace(pkgLine, `${pkgLine}\n\n${importLine}`);
  }

  return `${importLine}\n${mainAppText}`;
}

function ensurePackagesAddLine(mainAppText, addLine) {
  if (mainAppText.includes(addLine)) return mainAppText;

  // Prefer insert after existing XfIatPackage line (your project already has it)
  const xfLine = "packages.add(XfIatPackage())";
  if (mainAppText.includes(xfLine)) {
    return mainAppText.replace(xfLine, `${xfLine}\n            ${addLine}`);
  }

  // Fallback: insert before "return packages"
  const returnRegex = /return packages/;
  if (returnRegex.test(mainAppText)) {
    return mainAppText.replace(returnRegex, `            ${addLine}\n            return packages`);
  }

  throw new Error("Could not find insertion point in getPackages() to add AzureSpeechPackage()");
}

// ---------- plugin ----------
export default function withAzureSpeechAndroid(config) {
  // 2) Ensure mavenCentral in root project build.gradle
  config = withProjectBuildGradle(config, (cfg) => {
    let content = cfg.modResults.contents;

    if (!content.includes("mavenCentral()")) {
      content = content.replace(/repositories\s*{/, "repositories {\n        mavenCentral()");
    }

    cfg.modResults.contents = content;
    return cfg;
  });

  // 3) Add Azure Speech dependency and proguard include to app/build.gradle
  config = withAppBuildGradle(config, (cfg) => {
    let content = cfg.modResults.contents;

    if (!content.includes("com.microsoft.cognitiveservices.speech:client-sdk")) {
      content = content.replace(/dependencies\s*{/, `dependencies {\n    ${SPEECH_DEP}\n`);
    }

    // Try to include our proguard file in release build (if using proguard-rules.pro)
    if (!content.includes("azure-speech-proguard.pro")) {
      content = content.replace(
        /proguardFiles\s+getDefaultProguardFile\(['"]proguard-android-optimize\.txt['"]\),\s*['"]proguard-rules\.pro['"]/,
        (m) => `${m}, 'azure-speech-proguard.pro'`,
      );
    }

    cfg.modResults.contents = content;
    return cfg;
  });

  // 4) Dangerous mod: copy native code & patch MainApplication.kt automatically
  config = withDangerousMod(config, [
    "android",
    (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;

      const androidMainJava = path.join(projectRoot, "android", "app", "src", "main", "java");

      // Copy Kotlin files from your repo folder:
      // plugins/azure-speech-android/  -> android/app/src/main/java/com/blotz/blotztask/azurespeech/
      const srcNative = path.join(projectRoot, "plugins", "azure-speech-android");
      const destNative = path.join(androidMainJava, ...APP_PACKAGE_PATH, "azurespeech");

      copyDir(srcNative, destNative);

      // Copy proguard file
      const proguardSrc = path.join(srcNative, "proguard-rules.pro");
      const proguardDest = path.join(projectRoot, "android", "app", "azure-speech-proguard.pro");
      if (fs.existsSync(proguardSrc)) {
        fs.copyFileSync(proguardSrc, proguardDest);
      }

      // Patch MainApplication.kt to register AzureSpeechPackage
      const mainApplicationPath = path.join(
        androidMainJava,
        ...APP_PACKAGE_PATH,
        "MainApplication.kt",
      );
      if (!fs.existsSync(mainApplicationPath)) {
        throw new Error(`MainApplication.kt not found at ${mainApplicationPath}`);
      }

      let mainAppText = fs.readFileSync(mainApplicationPath, "utf8");

      // import
      const importLine = `import ${APP_PACKAGE}.azurespeech.AzureSpeechPackage`;
      mainAppText = ensureImport(mainAppText, importLine);

      // add package in getPackages()
      const addLine = "packages.add(AzureSpeechPackage())";
      mainAppText = ensurePackagesAddLine(mainAppText, addLine);

      fs.writeFileSync(mainApplicationPath, mainAppText, "utf8");

      return cfg;
    },
  ]);

  return config;
}
