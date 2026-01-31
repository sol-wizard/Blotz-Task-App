"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
function _picocolors() {
  const data = _interopRequireDefault(require("picocolors"));
  _picocolors = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const SEPARATOR = ', ';
let verbose = false;
let disabled = false;
let hidden = false;
const formatMessages = messages => _picocolors().default.reset(messages.join(SEPARATOR));
const success = (...messages) => {
  if (!disabled) {
    console.log(`${_picocolors().default.green(_picocolors().default.bold('success'))} ${formatMessages(messages)}`);
  }
};
const info = (...messages) => {
  if (!disabled) {
    console.log(`${_picocolors().default.cyan(_picocolors().default.bold('info'))} ${formatMessages(messages)}`);
  }
};
const warn = (...messages) => {
  if (!disabled) {
    console.warn(`${_picocolors().default.yellow(_picocolors().default.bold('warn'))} ${formatMessages(messages)}`);
  }
};
const error = (...messages) => {
  if (!disabled) {
    console.error(`${_picocolors().default.red(_picocolors().default.bold('error'))} ${formatMessages(messages)}`);
  }
};
const debug = (...messages) => {
  if (verbose && !disabled) {
    console.log(`${_picocolors().default.gray(_picocolors().default.bold('debug'))} ${formatMessages(messages)}`);
  } else {
    hidden = true;
  }
};
const log = (...messages) => {
  if (!disabled) {
    console.log(`${formatMessages(messages)}`);
  }
};
const setVerbose = level => {
  verbose = level;
};
const isVerbose = () => verbose;
const disable = () => {
  disabled = true;
};
const enable = () => {
  disabled = false;
};
const hasDebugMessages = () => hidden;
var _default = {
  success,
  info,
  warn,
  error,
  debug,
  log,
  setVerbose,
  isVerbose,
  hasDebugMessages,
  disable,
  enable
};
exports.default = _default;

//# sourceMappingURL=logger.js.map