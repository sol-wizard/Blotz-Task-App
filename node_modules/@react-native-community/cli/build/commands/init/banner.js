"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = banner;
function _picocolors() {
  const data = _interopRequireDefault(require("picocolors"));
  _picocolors = function () {
    return data;
  };
  return data;
}
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
const reactLogoArray = ['                                                          ', '               ######                ######               ', '             ###     ####        ####     ###             ', '            ##          ###    ###          ##            ', '            ##             ####             ##            ', '            ##             ####             ##            ', '            ##           ##    ##           ##            ', '            ##         ###      ###         ##            ', '             ##  ########################  ##             ', '          ######    ###            ###    ######          ', '      ###     ##    ##              ##    ##     ###      ', '   ###         ## ###      ####      ### ##         ###   ', '  ##           ####      ########      ####           ##  ', ' ##             ###     ##########     ###             ## ', '  ##           ####      ########      ####           ##  ', '   ###         ## ###      ####      ### ##         ###   ', '      ###     ##    ##              ##    ##     ###      ', '          ######    ###            ###    ######          ', '             ##  ########################  ##             ', '            ##         ###      ###         ##            ', '            ##           ##    ##           ##            ', '            ##             ####             ##            ', '            ##             ####             ##            ', '            ##          ###    ###          ##            ', '             ###     ####        ####     ###             ', '               ######                ######               ', '                                                          '];
const getWelcomeMessage = (reactNativeVersion = '') => {
  if (reactNativeVersion) {
    return `              Welcome to React Native ${reactNativeVersion}!                `;
  }
  return '                  Welcome to React Native!                ';
};
const learnOnceMessage = '                 Learn once, write anywhere               ';
function banner(reactNativeVersion) {
  return `${_picocolors().default.cyan(reactLogoArray.join('\n'))}

${_picocolors().default.cyanBright(_picocolors().default.bold(getWelcomeMessage(reactNativeVersion)))}
${_picocolors().default.dim(learnOnceMessage)}
`;
}

//# sourceMappingURL=banner.js.map