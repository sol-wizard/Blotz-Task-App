const { withAppBuildGradle, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

/* ============================================================
 * 基础配置
 * ============================================================ */

const SDK_DIR = "keys/xunfei-android"; // 你放 Codec.aar / SparkChain.aar 的地方
const ANDROID_LIBS_REL = ["android", "app", "libs"];
const APP_PROGUARD = ["android", "app", "proguard-rules.pro"];

const PACKAGE_NAME = "com.blotz.blotztask";
const JAVA_DST_DIR = ["android", "app", "src", "main", "java", ...PACKAGE_NAME.split("."), "xfyun"];

/* ============================================================
 * utils
 * ============================================================ */

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

/* ============================================================
 * patch MainApplication.kt (Expo New Architecture)
 * ============================================================ */

function patchMainApplication(mainAppPath) {
  let content = fs.readFileSync(mainAppPath, "utf8");

  // 1) import XfIatPackage
  const importLine = `import ${PACKAGE_NAME}.xfyun.XfIatPackage`;
  if (!content.includes(importLine)) {
    content = content.replace(/(import[^\n]*\n)+/m, (m) => m + importLine + "\n");
  }

  // 2) 在 Expo 模板的稳定锚点插入 packages.add(...)
  const anchor = "val packages = PackageList(this).packages";
  if (content.includes(anchor) && !content.includes("packages.add(XfIatPackage())")) {
    content = content.replace(anchor, `${anchor}\n            packages.add(XfIatPackage())`);
  }

  fs.writeFileSync(mainAppPath, content);
}

/* ============================================================
 * patch settings.gradle  —— ★ 关键中的关键 ★
 * （Version Catalog 模式下，AAR 仓库只能在这里生效）
 * ============================================================ */

function patchSettingsGradle(settingsPath) {
  let content = fs.readFileSync(settingsPath, "utf8");

  // 幂等：已经处理过就不再处理
  if (content.includes("XUNFEI_FLATDIR")) return;

  const flatDirBlock = `
    // XUNFEI_FLATDIR
    flatDir { dirs("app/libs") }
`;

  // case 1：已经存在 dependencyResolutionManagement
  const drmRegex = /dependencyResolutionManagement\s*\{[\s\S]*?repositories\s*\{([\s\S]*?)\n\s*\}/m;

  if (drmRegex.test(content)) {
    content = content.replace(drmRegex, (m) =>
      m.replace(/repositories\s*\{\n/, (x) => x + flatDirBlock),
    );
    fs.writeFileSync(settingsPath, content);
    return;
  }

  // case 2：不存在 DRM（你的项目就是这种）→ 追加一个
  content += `

dependencyResolutionManagement {
  repositories {
${flatDirBlock}
    google()
    mavenCentral()
  }
}
`;

  fs.writeFileSync(settingsPath, content);
}

/* ============================================================
 * plugin 主体
 * ============================================================ */

function withXunfeiMsc(config) {
  /**
   * 1️⃣ 在 app/build.gradle 注入 AAR 依赖声明
   *   implementation(name: 'Codec', ext: 'aar')
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
   * 2️⃣ Dangerous mod：文件系统级操作
   */
  config = withDangerousMod(config, [
    "android",
    async (c) => {
      const projectRoot = c.modRequest.projectRoot;

      /* ---- copy AAR 到 android/app/libs ---- */
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

      /* ---- ★ patch settings.gradle（AAR 能否被找到的生死线） ---- */
      const settingsGradle = path.join(projectRoot, "android", "settings.gradle");
      if (fs.existsSync(settingsGradle)) {
        patchSettingsGradle(settingsGradle);
      }

      return c;
    },
  ]);

  return config;
}

module.exports = withXunfeiMsc;
