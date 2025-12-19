/** @type {import('tailwindcss').Config} */

module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: "#F5F9FA",
        warning: "#F56767",
        primary: "#8C8C8C",
        secondary: "#444964",
        highlight: "#9AD513",
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
