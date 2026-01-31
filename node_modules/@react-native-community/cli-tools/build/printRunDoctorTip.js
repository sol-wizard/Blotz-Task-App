"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _logger = _interopRequireDefault(require("./logger"));
function _picocolors() {
  const data = _interopRequireDefault(require("picocolors"));
  _picocolors = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const printRunDoctorTip = () => {
  const linkToDocs = 'https://github.com/react-native-community/cli/blob/main/packages/cli-doctor/README.md#doctor';
  _logger.default.log('');
  _logger.default.info(_picocolors().default.dim(`${_picocolors().default.dim('💡 Tip: Make sure that you have set up your development environment correctly, by running')} ${_picocolors().default.reset(_picocolors().default.bold('npx react-native doctor'))}. ${_picocolors().default.dim(`To read more about doctor command visit: ${linkToDocs} \n`)}`));
};
var _default = printRunDoctorTip;
exports.default = _default;

//# sourceMappingURL=printRunDoctorTip.js.map