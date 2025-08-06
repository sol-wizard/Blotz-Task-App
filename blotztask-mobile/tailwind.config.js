/** @type {import('tailwindcss').Config} */

const { COLORS } = require("./src/constants/colors.ts");

module.exports = {
  // NOTE: Update this to include the paths to all files that contain Nativewind classes.
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: COLORS.primary,
      },
    },
  },
  plugins: [],
};
