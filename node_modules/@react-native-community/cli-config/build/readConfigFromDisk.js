"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.readConfigFromDisk = readConfigFromDisk;
exports.readConfigFromDiskAsync = readConfigFromDiskAsync;
exports.readDependencyConfigFromDisk = readDependencyConfigFromDisk;
exports.readDependencyConfigFromDiskAsync = readDependencyConfigFromDiskAsync;
function _cosmiconfig() {
  const data = require("cosmiconfig");
  _cosmiconfig = function () {
    return data;
  };
  return data;
}
var _errors = require("./errors");
var schema = _interopRequireWildcard(require("./schema"));
function _cliTools() {
  const data = require("@react-native-community/cli-tools");
  _cliTools = function () {
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
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }
function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }
/**
 * Places to look for the configuration file.
 * Note that we need different sets for CJS and ESM because the synchronous
 * version cannot contain `.mjs` files. Doing so will cause "Error: Missing
 * loader for extension" during runtime.
 */
const searchPlacesForCJS = ['react-native.config.js', 'react-native.config.cjs', 'react-native.config.ts'];
const searchPlaces = [...searchPlacesForCJS, 'react-native.config.mjs'];
function parseUserConfig(searchResult) {
  const config = searchResult ? searchResult.config : undefined;
  const result = schema.projectConfig.validate(config);
  if (result.error) {
    throw new _errors.JoiError(result.error);
  }
  return result.value;
}

/**
 * Reads a project configuration as defined by the user in the current
 * workspace.
 */
async function readConfigFromDiskAsync(rootFolder) {
  const explorer = (0, _cosmiconfig().cosmiconfig)('react-native', {
    stopDir: rootFolder,
    searchPlaces
  });
  const searchResult = await explorer.search(rootFolder);
  return parseUserConfig(searchResult);
}

/**
 * Reads a project configuration as defined by the user in the current
 * workspace synchronously.
 */

function readConfigFromDisk(rootFolder) {
  const explorer = (0, _cosmiconfig().cosmiconfigSync)('react-native', {
    stopDir: rootFolder,
    searchPlaces: searchPlacesForCJS
  });
  const searchResult = explorer.search(rootFolder);
  return parseUserConfig(searchResult);
}
function parseDependencyConfig(dependencyName, searchResult) {
  const config = searchResult ? searchResult.config : emptyDependencyConfig;
  const result = schema.dependencyConfig.validate(config, {
    abortEarly: false
  });
  if (result.error) {
    const validationError = new _errors.JoiError(result.error);
    _cliTools().logger.warn((0, _cliTools().inlineString)(`
        Package ${_picocolors().default.bold(dependencyName)} contains invalid configuration: ${_picocolors().default.bold(validationError.message)}.

      Please verify it's properly linked using "npx react-native config" command and contact the package maintainers about this.`));
  }
  return result.value;
}

/**
 * Reads a dependency configuration as defined by the developer
 * inside `node_modules`.
 */
async function readDependencyConfigFromDiskAsync(rootFolder, dependencyName) {
  const explorer = (0, _cosmiconfig().cosmiconfig)('react-native', {
    stopDir: rootFolder,
    searchPlaces
  });
  const searchResult = await explorer.search(rootFolder);
  return parseDependencyConfig(dependencyName, searchResult);
}

/**
 * Reads a dependency configuration as defined by the developer
 * inside `node_modules` synchronously.
 */

function readDependencyConfigFromDisk(rootFolder, dependencyName) {
  const explorer = (0, _cosmiconfig().cosmiconfigSync)('react-native', {
    stopDir: rootFolder,
    searchPlaces: searchPlacesForCJS
  });
  const searchResult = explorer.search(rootFolder);
  return parseDependencyConfig(dependencyName, searchResult);
}
const emptyDependencyConfig = {
  dependency: {
    platforms: {}
  },
  commands: [],
  platforms: {}
};

//# sourceMappingURL=readConfigFromDisk.js.map