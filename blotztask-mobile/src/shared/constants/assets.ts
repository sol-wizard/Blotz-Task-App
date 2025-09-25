/**
 * Centralized asset constants for the mobile app
 * This helps maintain consistent asset paths and makes refactoring easier
 */

// Lottie animations
export const LOTTIE_ANIMATIONS = {
  emptyBox: require("../../../assets/images/empty-box.json"),
  aiLoadingEffect: require("../../../assets/images/aiLoadingEffect.json"),
  spinner: require("../../../assets/images/spinner.json"),
} as const;

// Images
export const IMAGES = {
  blotzIcon: require("../../../assets/images/blotz-icon.jpg"),
  blotzLogo: require("../../../assets/images/blotz-logo.png"),
} as const;

// Export all assets for convenience
export const ASSETS = {
  ...LOTTIE_ANIMATIONS,
  ...IMAGES,
} as const;
