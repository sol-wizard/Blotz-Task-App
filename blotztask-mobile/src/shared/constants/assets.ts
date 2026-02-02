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
  spinner: require("../../../assets/animations/spinner.json"),
  voiceWave: require("../../../assets/animations/voice-wave.json"),
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
  successBun: require("../../../assets/images-png/success-bun.png"),
  transparentStar: require("../../../assets/images-png/transparent-star.png"),
  onboardingCalendar: require("../../../assets/images-png/onboarding-calendar.png"),
  onboardingBreakdown: require("../../../assets/images-png/onboarding-breakdown.png"),
  onboardingNote: require("../../../assets/images-png/onboarding-note.png"),
  onboardingVoice: require("../../../assets/images-png/onboarding-voice.png"),
  onboardingStarSpark: require("../../../assets/images-png/onboarding-starspark.png"),
  onboardingBreakdownBackground: require("../../../assets/images-png/onboarding-breakdown-background.png"),
  onboardingNoteBackground: require("../../../assets/images-png/onboarding-note-background.png"),
  onboardingBlotzLogo: require("../../../assets/images-png/onboarding-blotz-logo.png"),
  onboardingVoiceBackground: require("../../../assets/images-png/onboarding-voice-background.png"),
} as const;

export const SVGIMAGES = {
  dashedStar: DashedStar,
  dashedPlus: DashedPlus,
  dashedHouse: DashedHouse,
  dashedSettings: DashedSettings,
} as const;

export const SOUNDS = {
  buttonSpin: require("../../../assets/sounds/button-spin.mp3"),
};

// Export all assets for convenience
export const ASSETS = {
  ...LOTTIE_ANIMATIONS,
  ...PNGIMAGES,
  ...SVGIMAGES,
  ...SOUNDS,
} as const;
