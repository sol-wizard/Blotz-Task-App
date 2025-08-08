/** @type {import('tailwindcss').Config} */

const { COLORS } = require("./src/shared/constants/colors.ts");

module.exports = {
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
