import DashedStar from "../../../assets/images-svg/star-dashed.svg";
import DashedPlus from "../../../assets/images-svg/plus-dashed.svg";
import DashedHouse from "../../../assets/images-svg/house-dashed.svg";
import DashedSettings from "../../../assets/images-svg/settings-dashed.svg";

/**
 * Centralized asset constants for the mobile app
 * This helps maintain consistent asset paths and makes refactoring easier
 */

// Lottie animations
export const LOTTIE_ANIMATIONS = {
  emptyBox: require("../../../assets/animations/empty-box.json"),
  aiLoadingEffect: require("../../../assets/animations/aiLoadingEffect.json"),
  spinner: require("../../../assets/animations/spinner.json"),
  jumpingDots: require("../../../assets/animations/jumping-dots.json"),
} as const;

// Images
export const PNGIMAGES = {
  blotzIcon: require("../../../assets/images-png/blotz-icon.png"),
  blotzLogo: require("../../../assets/images-png/blotz-logo.png"),
  whiteBun: require("../../../assets/images-png/bun-white.png"),
  greenBun: require("../../../assets/images-png/bun-green.png"),
  plusIcon: require("../../../assets/images-png/plus-icon.png"),
  loadingBun: require("../../../assets/images-png/loading-logo.png"),
  loadingShadow: require("../../../assets/images-png/loading-shadow.png"),
  gashaponMachineBase: require("../../../assets/images-png/gashapon-machine-without-button.png"),
  gashaponMachineButton: require("../../../assets/images-png/gashapon-machine-button.png"),
  yellowStar: require("../../../assets/images-png/yellow-star.png"),
  greenStar: require("../../../assets/images-png/green-star.png"),
  purpleStar: require("../../../assets/images-png/purple-star.png"),
  blueStar: require("../../../assets/images-png/blue-star.png"),
  rainbowStar: require("../../../assets/images-png/rainbow-star.png"),
  greenHouse: require("../../../assets/images-png/green-house.png"),
  starSpark: require("../../../assets/images-png/star-spark.png"),
  settingIcon: require("../../../assets/images-png/setting-icon.png"),
  machineEyes: require("../../../assets/images-png/machine-eyes.png"),
} as const;

export const SVGIMAGES = {
  dashedStar: DashedStar,
  dashedPlus: DashedPlus,
  dashedHouse: DashedHouse,
  dashedSettings: DashedSettings,
} as const;

// Export all assets for convenience
export const ASSETS = {
  ...LOTTIE_ANIMATIONS,
  ...PNGIMAGES,
  ...SVGIMAGES,
} as const;
