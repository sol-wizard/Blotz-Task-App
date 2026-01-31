"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.compareMd5Hashes = compareMd5Hashes;
exports.default = resolvePods;
exports.dependenciesToString = dependenciesToString;
exports.execaPod = execaPod;
exports.generateMd5Hash = generateMd5Hash;
exports.getPlatformDependencies = getPlatformDependencies;
function _path() {
  const data = _interopRequireDefault(require("path"));
  _path = function () {
    return data;
  };
  return data;
}
function _fsExtra() {
  const data = _interopRequireDefault(require("fs-extra"));
  _fsExtra = function () {
    return data;
  };
  return data;
}
function _crypto() {
  const data = require("crypto");
  _crypto = function () {
    return data;
  };
  return data;
}
function _picocolors() {
  const data = _interopRequireDefault(require("picocolors"));
  _picocolors = function () {
    return data;
  };
  return data;
}
function _cliTools() {
  const data = require("@react-native-community/cli-tools");
  _cliTools = function () {
    return data;
  };
  return data;
}
var _installPods = _interopRequireDefault(require("./installPods"));
var _runCodegen = _interopRequireDefault(require("./runCodegen"));
function _execa() {
  const data = _interopRequireDefault(require("execa"));
  _execa = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function getPackageJson(root) {
  try {
    return require(_path().default.join(root, 'package.json'));
  } catch {
    throw new (_cliTools().CLIError)('No package.json found. Please make sure the file exists in the current folder.');
  }
}
function getPlatformDependencies(dependencies, platformName) {
  return Object.keys(dependencies).filter(dependency => {
    var _dependencies$depende;
    return (_dependencies$depende = dependencies[dependency].platforms) === null || _dependencies$depende === void 0 ? void 0 : _dependencies$depende[platformName];
  }).map(dependency => {
    var _dependencies$depende2;
    return `${dependency}@${((_dependencies$depende2 = dependencies[dependency].platforms) === null || _dependencies$depende2 === void 0 ? void 0 : _dependencies$depende2[platformName]).version}`;
  }).sort();
}
function dependenciesToString(dependencies) {
  return dependencies.join('\n');
}
function generateMd5Hash(text) {
  return (0, _crypto().createHash)('md5').update(text).digest('hex');
}
function compareMd5Hashes(hash1, hash2) {
  return hash1 === hash2;
}
async function getChecksum(podfileLockPath) {
  try {
    const file = _fsExtra().default.readFileSync(podfileLockPath, 'utf8');
    const checksumLine = file.split('\n').find(line => line.includes('PODFILE CHECKSUM'));
    if (checksumLine) {
      return checksumLine.split(': ')[1];
    }
    return undefined;
  } catch {
    return undefined;
  }
}
async function install(packageJson, cachedDependenciesHash, currentDependenciesHash, iosFolderPath, platform, root, reactNativePath) {
  const loader = (0, _cliTools().getLoader)('Installing CocoaPods...');
  try {
    await (0, _runCodegen.default)({
      root,
      platform,
      reactNativePath,
      iosFolderPath
    });
    await (0, _installPods.default)(loader, {
      skipBundleInstall: !!cachedDependenciesHash,
      iosFolderPath
    });
    _cliTools().cacheManager.set(packageJson.name, 'dependencies', currentDependenciesHash);
    loader.succeed();
  } catch (error) {
    loader.fail();
    throw new (_cliTools().CLIError)(`Something went wrong while installing CocoaPods. Please run ${_picocolors().default.bold('pod install')} manually`, error);
  }
}
async function resolvePods(root, sourceDir, nativeDependencies, platformName, reactNativePath, options) {
  const packageJson = getPackageJson(root);
  const podfilePath = _path().default.join(sourceDir, 'Podfile'); // sourceDir is calculated based on Podfile location, see getProjectConfig()

  const podfileLockPath = _path().default.join(sourceDir, 'Podfile.lock');
  const platformFolderPath = podfilePath ? podfilePath.slice(0, podfilePath.lastIndexOf('/')) : _path().default.join(root, platformName);
  const podsPath = _path().default.join(platformFolderPath, 'Pods');
  const arePodsInstalled = _fsExtra().default.existsSync(podsPath);
  const platformDependencies = getPlatformDependencies(nativeDependencies, platformName);
  const dependenciesString = dependenciesToString(platformDependencies);
  const currentDependenciesHash = generateMd5Hash(dependenciesString);
  // Users can manually add dependencies to Podfile, so we can't entirely rely on `dependencies` from `config`'s output.
  const currentPodfileHash = generateMd5Hash(_fsExtra().default.readFileSync(podfilePath, 'utf8'));
  let currentPodfileLockChecksum = await getChecksum(podfileLockPath);
  const cachedPodfileHash = _cliTools().cacheManager.get(packageJson.name, 'podfile');
  const cachedPodfileLockChecksum = _cliTools().cacheManager.get(packageJson.name, 'podfileLock');
  const cachedDependenciesHash = _cliTools().cacheManager.get(packageJson.name, 'dependencies');
  if (options === null || options === void 0 ? void 0 : options.forceInstall) {
    await install(packageJson, cachedDependenciesHash, currentDependenciesHash, platformFolderPath, platformName, root, reactNativePath);
  } else if (arePodsInstalled && compareMd5Hashes(currentDependenciesHash, cachedDependenciesHash) && compareMd5Hashes(currentPodfileHash, cachedPodfileHash) && compareMd5Hashes(currentPodfileLockChecksum, cachedPodfileLockChecksum)) {
    _cliTools().cacheManager.set(packageJson.name, 'dependencies', currentDependenciesHash);
    _cliTools().cacheManager.set(packageJson.name, 'podfile', currentPodfileHash);
    _cliTools().cacheManager.set(packageJson.name, 'podfileLock', currentPodfileLockChecksum ?? '');
  } else {
    const loader = (0, _cliTools().getLoader)('Installing CocoaPods...');
    try {
      await (0, _installPods.default)(loader, {
        skipBundleInstall: !!cachedDependenciesHash,
        newArchEnabled: options === null || options === void 0 ? void 0 : options.newArchEnabled,
        iosFolderPath: platformFolderPath
      });
      _cliTools().cacheManager.set(packageJson.name, 'dependencies', currentDependenciesHash);
      _cliTools().cacheManager.set(packageJson.name, 'podfile', currentPodfileHash);
      // We need to read again the checksum because value changed after running `pod install`
      currentPodfileLockChecksum = await getChecksum(podfileLockPath);
      _cliTools().cacheManager.set(packageJson.name, 'podfileLock', currentPodfileLockChecksum ?? '');
      loader.succeed();
    } catch (error) {
      loader.fail();
      throw new (_cliTools().CLIError)(`Something went wrong while installing CocoaPods. Please run ${_picocolors().default.bold('pod install')} manually`, error);
    }
  }
}
async function execaPod(args, options) {
  let podType = 'system';
  try {
    // try bundle pod first
    await (0, _execa().default)('bundle', ['exec', 'pod', '--version'], options);
    podType = 'bundle';
  } catch (bundlePodError) {
    // try to install bundle pod
    try {
      await (0, _execa().default)('bundle', ['install']);
      await (0, _execa().default)('bundle', ['exec', 'pod', '--version'], options);
      podType = 'bundle';
    } catch (bundleInstallError) {
      // fall back to system pod
      try {
        await (0, _execa().default)('pod', ['--version'], options);
        podType = 'system';
      } catch (systemPodError) {
        throw new Error('cocoapods not installed');
      }
    }
  }
  if (podType === 'bundle') {
    return (0, _execa().default)('bundle', ['exec', 'pod', ...args], options);
  }
  return (0, _execa().default)('pod', args, options);
}

//# sourceMappingURL=pods.js.map