/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F5F9FA",
        surface: "#FFFFFF",
        warning: "#F56767",
        primary: "#000000",
        secondary: "#444964",
        tertiary: "#8C8C8C",
      },
      fontFamily: {
        balooThin: ["BalooThin"],
        baloo: ["BalooRegular"],
        balooBold: ["BalooBold"],
        balooExtraBold: ["BalooExtraBold"],
        interThin: ["InterThin"],
        interBold: ["InterBold"],
      },
    },
  },
  plugins: [],
};
