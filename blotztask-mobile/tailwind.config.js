/** @type {import('tailwindcss').Config} */

const { COLORS } = require("./src/shared/constants/colors.ts");

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F5F9FA",
        surface: "#FFFFFF",
        warning: "#F56767",
        textPrimary: "#000000",
        textSecondary: "#444964",
      },
      fontFamily: {
        baloo: ["BalooRegular"],
        balooBold: ["BalooBold"],
      },
    },
  },
  plugins: [],
};
