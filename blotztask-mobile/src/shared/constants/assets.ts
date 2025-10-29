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
  capsuleToy: require("../../../assets/images/capsule-toy.png"),
  turnKnobButton: require("../../../assets/images/turn-knob-button.png"),
} as const;

// Export all assets for convenience
export const ASSETS = {
  ...LOTTIE_ANIMATIONS,
  ...IMAGES,
} as const;
