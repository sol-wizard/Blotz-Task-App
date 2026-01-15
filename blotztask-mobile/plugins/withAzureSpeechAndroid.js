/* eslint-disable @typescript-eslint/no-require-imports */
const {
  withAppBuildGradle,
  withProjectBuildGradle,
  withDangerousMod,
  withAndroidManifest, // ✅ NEW
} = require("@expo/config-plugins");

const fs = require("fs");
const path = require("path");

const APP_PACKAGE = "com.blotz.blotztask";
const APP_PACKAGE_PATH = APP_PACKAGE.split(".");
const SPEECH_DEP = 'implementation "com.microsoft.cognitiveservices.speech:client-sdk:1.37.0"';

// Azure Speech SDK internal provider name (the class)
const AZURE_PROVIDER_NAME = "com.microsoft.cognitiveservices.speech.util.InternalContentProvider";

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

/**
 * ✅ Expo 54 Kotlin MainApplication 模板：
 * override fun getPackages(): List<ReactPackage> =
 *   PackageList(this).packages.apply { ... }
 *
 * 我们要在 apply block 内插入： add(AzureSpeechPackage())
 */
function ensureKotlinApplyAdd(mainAppText, addExpr /* e.g. add(AzureSpeechPackage()) */) {
  if (mainAppText.includes(addExpr)) return mainAppText;

  const lines = mainAppText.split("\n");

  // 找到 "PackageList(this).packages.apply {" 这一行
  const applyLineIndex = lines.findIndex((l) =>
    /PackageList\(this\)\.packages\.apply\s*\{\s*$/.test(l),
  );

  if (applyLineIndex === -1) {
    throw new Error("Could not find `PackageList(this).packages.apply {` in MainApplication.kt");
  }

  const applyLine = lines[applyLineIndex];
  const baseIndentMatch = applyLine.match(/^(\s*)/);
  const baseIndent = baseIndentMatch ? baseIndentMatch[1] : "";
  const innerIndent = baseIndent + "  "; // apply block 内缩进两格（与模板注释一致）

  // 找到对应 apply block 的关闭 "}"（同一缩进级别）
  const closeRegex = new RegExp(`^${escapeRegExp(baseIndent)}\\}\\s*$`);
  let closeIndex = -1;
  for (let i = applyLineIndex + 1; i < lines.length; i++) {
    if (closeRegex.test(lines[i])) {
      closeIndex = i;
      break;
    }
  }
  if (closeIndex === -1) {
    throw new Error("Could not find closing `}` for apply block in MainApplication.kt");
  }

  // 插入位置：尽量放在注释块之后（保持模板注释在顶部）
  let insertIndex = closeIndex; // 默认插在 block 结束前
  for (let i = applyLineIndex + 1; i < closeIndex; i++) {
    if (lines[i].startsWith(innerIndent + "//")) {
      insertIndex = i + 1; // 放到最后一行注释之后
    }
  }

  // 如果注释块后面还有空行，可以跳过空行，保持紧凑
  while (insertIndex < closeIndex && lines[insertIndex].trim() === "") {
    insertIndex++;
  }

  lines.splice(insertIndex, 0, `${innerIndent}${addExpr}`);
  return lines.join("\n");
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ---------- plugin ----------
function withAzureSpeechAndroid(config) {
  /**
   * 0) ✅ Fix Google Play ContentProvider authority conflict
   * Azure Speech SDK ships a provider with a hard-coded authority:
   *   com.microsoft.cognitiveservices.speech.util.InternalContentProvider
   * This is NOT globally unique, so Google Play rejects the AAB.
   *
   * We override it to: ${applicationId}.microsoftSpeechInternalProvider
   */
  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;

    // ✅ Ensure tools namespace exists on <manifest>
    manifest.manifest.$ = manifest.manifest.$ ?? {};
    if (!manifest.manifest.$["xmlns:tools"]) {
      manifest.manifest.$["xmlns:tools"] = "http://schemas.android.com/tools";
    }

    const app = manifest.manifest.application?.[0];
    if (!app) return cfg;

    app.provider = app.provider ?? [];

    const uniqueAuthority = "${applicationId}.microsoftSpeechInternalProvider";

    const existing = app.provider.find((p) => p?.$?.["android:name"] === AZURE_PROVIDER_NAME);

    const patchProviderAttrs = (provider) => {
      provider.$["android:authorities"] = uniqueAuthority;
      provider.$["android:exported"] = provider.$["android:exported"] ?? "false";

      // ✅ Tell manifest merger we intentionally override this attribute
      provider.$["tools:replace"] = "android:authorities";
    };

    if (existing) {
      patchProviderAttrs(existing);
    } else {
      const newProvider = {
        $: {
          "android:name": AZURE_PROVIDER_NAME,
          "android:authorities": uniqueAuthority,
          "android:exported": "false",
          "tools:replace": "android:authorities",
        },
      };
      app.provider.push(newProvider);
    }

    return cfg;
  });

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

      // ✅ import
      const importLine = `import ${APP_PACKAGE}.azurespeech.AzureSpeechPackage`;
      mainAppText = ensureImport(mainAppText, importLine);

      // ✅ Kotlin apply block 内插入 add(...)
      mainAppText = ensureKotlinApplyAdd(mainAppText, "add(AzureSpeechPackage())");

      fs.writeFileSync(mainApplicationPath, mainAppText, "utf8");
      return cfg;
    },
  ]);

  return config;
}

module.exports = withAzureSpeechAndroid;
