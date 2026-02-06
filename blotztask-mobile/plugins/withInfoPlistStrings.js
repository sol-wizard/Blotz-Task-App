const fs = require("fs");
const path = require("path");
const { withDangerousMod, withXcodeProject } = require("@expo/config-plugins");

function toStringsFile(strings) {
  return Object.entries(strings)
    .map(([key, value]) => `"${key}" = "${String(value).replace(/"/g, '\\"')}";`)
    .join("\n");
}

function writeInfoPlistStrings(projectRoot, projectName, locale, strings) {
  const lprojDir = path.join(projectRoot, projectName, `${locale}.lproj`);
  fs.mkdirSync(lprojDir, { recursive: true });
  const filePath = path.join(lprojDir, "InfoPlist.strings");
  fs.writeFileSync(filePath, toStringsFile(strings) + "\n");
  return filePath;
}

function addResource(project, iosProjectRoot, absoluteFilePath) {
  const relativePath = path.relative(iosProjectRoot, absoluteFilePath);

  // 避免重复添加
  const fileRefSection = project.pbxFileReferenceSection();
  const alreadyAdded = Object.values(fileRefSection).some((v) => v.path === relativePath);
  if (alreadyAdded) return;

  const firstTarget = project.getFirstTarget()?.uuid;
  project.addResourceFile(relativePath, { target: firstTarget });
}

module.exports = function withInfoPlistStrings(config, props = {}) {
  let writtenFiles = [];

  // 1) 写文件（dangerous mod）
  config = withDangerousMod(config, [
    "ios",
    async (config) => {
      const projectRoot = config.modRequest.platformProjectRoot; // ios/
      const projectName = config.modRequest.projectName || config.ios?.projectName || config.name;

      if (!projectName)
        throw new Error("Unable to determine iOS project name for InfoPlist.strings.");

      writtenFiles = [];

      if (props.en) {
        writtenFiles.push(writeInfoPlistStrings(projectRoot, projectName, "en", props.en));
      }
      if (props["zh-Hans"]) {
        writtenFiles.push(
          writeInfoPlistStrings(projectRoot, projectName, "zh-Hans", props["zh-Hans"]),
        );
      }

      return config;
    },
  ]);

  // 2) 加入 Xcode Resources（xcode mod）
  config = withXcodeProject(config, (config) => {
    const iosProjectRoot = config.modRequest.platformProjectRoot; // ios/
    const project = config.modResults;

    for (const f of writtenFiles) {
      addResource(project, iosProjectRoot, f);
    }

    return config;
  });

  return config;
};
