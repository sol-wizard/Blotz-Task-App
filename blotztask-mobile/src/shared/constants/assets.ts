/**
 * Centralized asset constants for the mobile app
 * This helps maintain consistent asset paths and makes refactoring easier
 */

// Lottie animations
export const LOTTIE_ANIMATIONS = {
  emptyBox: require("../../../assets/animations/empty-box.json"),
  aiLoadingEffect: require("../../../assets/animations/aiLoadingEffect.json"),
  spinner: require("../../../assets/animations/spinner.json"),
  voiceWave: require("../../../assets/animations/voice-wave.json"),
} as const;

// Images
export const IMAGES = {
  blotzIcon: require("../../../assets/images/blotz-icon.png"),
  blotzLogo: require("../../../assets/images/blotz-logo.png"),
  whiteBun: require("../../../assets/images/bun-white.png"),
  greenBun: require("../../../assets/images/bun-green.png"),
  plusIcon: require("../../../assets/images/plus-icon.png"),
  loadingBun: require("../../../assets/images/loading-bun.png"),
  gashaponMachineBase: require("../../../assets/images/gashapon-machine-without-button.png"),
  gashaponMachineButton: require("../../../assets/images/gashapon-machine-button.png"),
  yellowStar: require("../../../assets/images/yellow-star.png"),
  greenHouse: require("../../../assets/images/green-house.png"),
  dashedHouse: require("../../../assets/images/house-dashed.png"),
  starIcon: require("../../../assets/images/star-icon.png"),
  dashedStar: require("../../../assets/images/star-dashed.png"),
  dashedPlus: require("../../../assets/images/plus-dashed.png"),
  dashedSettings: require("../../../assets/images/setting-dashed.png"),
  settingIcon: require("../../../assets/images/setting-icon.png"),
} as const;

// Export all assets for convenience
export const ASSETS = {
  ...LOTTIE_ANIMATIONS,
  ...IMAGES,
} as const;
