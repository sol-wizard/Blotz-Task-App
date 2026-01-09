const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
} = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/* ---------------- config ---------------- */

const SDK_DIR = "keys/xunfei-android";
const ANDROID_LIBS_REL = ["android", "app", "libs"];
const APP_PROGUARD = ["android", "app", "proguard-rules.pro"];

const PACKAGE_NAME = "com.blotz.blotztask";
const JAVA_DST_DIR = ["android", "app", "src", "main", "java", ...PACKAGE_NAME.split("."), "xfyun"];

/* ---------------- utils ---------------- */

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function copyFile(src, dst) {
  ensureDir(path.dirname(dst));
  fs.copyFileSync(src, dst);
}

function appendIfMissing(filePath, marker, contentToAppend) {
  const exists = fs.existsSync(filePath);
  const current = exists ? fs.readFileSync(filePath, "utf8") : "";
  if (current.includes(marker)) return;
  fs.writeFileSync(filePath, `${current}\n\n${contentToAppend}\n`);
}

/* ---------------- patch MainApplication ---------------- */

function patchMainApplication(mainAppPath) {
  let content = fs.readFileSync(mainAppPath, "utf8");

  const importLine = `import ${PACKAGE_NAME}.xfyun.XfIatPackage`;
  if (!content.includes(importLine)) {
    content = content.replace(/(import[^\n]*\n)+/m, (m) => m + importLine + "\n");
  }

  // Expo New Architecture 稳定锚点
  const anchor = "val packages = PackageList(this).packages";
  if (content.includes(anchor) && !content.includes("packages.add(XfIatPackage())")) {
    content = content.replace(anchor, `${anchor}\n            packages.add(XfIatPackage())`);
  }

  fs.writeFileSync(mainAppPath, content);
}

/* ---------------- plugin ---------------- */

function withXunfeiMsc(config) {
  /**
   * ✅ 1️⃣ 注入 flatDir 到 android/build.gradle（project-level）
   * 这是解决 AAR 找不到的关键
   */
  config = withProjectBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;
    const marker = "// XUNFEI_FLATDIR";

    if (!gradle.includes(marker)) {
      const repoBlock = /allprojects\s*\{\s*repositories\s*\{/m;

      if (repoBlock.test(gradle)) {
        gradle = gradle.replace(
          repoBlock,
          (m) => `${m}\n        flatDir { dirs("app/libs") }\n        ${marker}`,
        );
      } else {
        // 兜底（极少见）
        gradle += `

allprojects {
  repositories {
    flatDir { dirs("app/libs") } ${marker}
    google()
    mavenCentral()
  }
}
`;
      }
    }

    c.modResults.contents = gradle;
    return c;
  });

  /**
   * ✅ 2️⃣ 在 android/app/build.gradle 注入 AAR dependency
   */
  config = withAppBuildGradle(config, (c) => {
    let gradle = c.modResults.contents;

    const depCodec = "implementation(name: 'Codec', ext: 'aar')";
    const depSpark = "implementation(name: 'SparkChain', ext: 'aar')";

    if (!gradle.includes(depCodec) || !gradle.includes(depSpark)) {
      gradle = gradle.replace(/dependencies\s*\{/, (m) => {
        const lines = [m];
        if (!gradle.includes(depCodec)) lines.push(`    ${depCodec}`);
        if (!gradle.includes(depSpark)) lines.push(`    ${depSpark}`);
        return lines.join("\n");
      });
    }

    c.modResults.contents = gradle;
    return c;
  });

  /**
   * ✅ 3️⃣ copy AAR / Kotlin / proguard + patch MainApplication
   */
  config = withDangerousMod(config, [
    "android",
    async (c) => {
      const projectRoot = c.modRequest.projectRoot;

      /* ---- copy AAR ---- */
      const libsDst = path.join(projectRoot, ...ANDROID_LIBS_REL);
      ensureDir(libsDst);

      copyFile(
        path.join(projectRoot, SDK_DIR, "libs", "Codec.aar"),
        path.join(libsDst, "Codec.aar"),
      );
      copyFile(
        path.join(projectRoot, SDK_DIR, "libs", "SparkChain.aar"),
        path.join(libsDst, "SparkChain.aar"),
      );

      /* ---- merge proguard ---- */
      const proguardSrc = path.join(projectRoot, SDK_DIR, "proguard-rules.pro");
      const proguardDst = path.join(projectRoot, ...APP_PROGUARD);
      const marker = "### XFYUN_SPARKCHAIN_RULES ###";
      const sdkRules = fs.readFileSync(proguardSrc, "utf8");

      appendIfMissing(
        proguardDst,
        marker,
        `${marker}\n${sdkRules}\n### END_XFYUN_SPARKCHAIN_RULES ###`,
      );

      /* ---- copy Kotlin native module ---- */
      const kotlinSrcDir = path.join(projectRoot, "plugins", "xunfei");
      const javaDstDir = path.join(projectRoot, ...JAVA_DST_DIR);
      ensureDir(javaDstDir);

      copyFile(path.join(kotlinSrcDir, "XfIatModule.kt"), path.join(javaDstDir, "XfIatModule.kt"));
      copyFile(
        path.join(kotlinSrcDir, "XfIatPackage.kt"),
        path.join(javaDstDir, "XfIatPackage.kt"),
      );

      /* ---- patch MainApplication.kt ---- */
      const mainAppKt = path.join(
        projectRoot,
        "android",
        "app",
        "src",
        "main",
        "java",
        ...PACKAGE_NAME.split("."),
        "MainApplication.kt",
      );

      if (!fs.existsSync(mainAppKt)) {
        throw new Error("MainApplication.kt not found for Xunfei plugin");
      }

      patchMainApplication(mainAppKt);
      return c;
    },
  ]);

  return config;
}

module.exports = withXunfeiMsc;
