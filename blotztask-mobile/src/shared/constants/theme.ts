import { MD3LightTheme, configureFonts } from "react-native-paper";
import { MD3Typescale } from "react-native-paper/lib/typescript/types";

const headingFamily = "Baloo-Bold";
const headingFamilySemibold = "Baloo-SemiBold";
const bodyFamily = "Baloo2-Regular";
const bodyFamilyMedium = "Baloo2-Medium";

// Custom MD3 font mapping: Use Baloo for the largest headings, etc., and Baloo2 for others
const fonts: MD3Typescale = {
  ...MD3LightTheme.fonts,
  displayLarge: { ...MD3LightTheme.fonts.displayLarge, fontFamily: headingFamily },
  displayMedium: { ...MD3LightTheme.fonts.displayMedium, fontFamily: headingFamily },
  displaySmall: { ...MD3LightTheme.fonts.displaySmall, fontFamily: headingFamily },

  headlineLarge: { ...MD3LightTheme.fonts.headlineLarge, fontFamily: headingFamily },
  headlineMedium: { ...MD3LightTheme.fonts.headlineMedium, fontFamily: headingFamily },
  headlineSmall: { ...MD3LightTheme.fonts.headlineSmall, fontFamily: headingFamilySemibold },

  titleLarge: { ...MD3LightTheme.fonts.titleLarge, fontFamily: headingFamilySemibold },
  titleMedium: { ...MD3LightTheme.fonts.titleMedium, fontFamily: bodyFamilyMedium },
  titleSmall: { ...MD3LightTheme.fonts.titleSmall, fontFamily: bodyFamilyMedium },

  labelLarge: { ...MD3LightTheme.fonts.labelLarge, fontFamily: bodyFamilyMedium },
  labelMedium: { ...MD3LightTheme.fonts.labelMedium, fontFamily: bodyFamily },
  labelSmall: { ...MD3LightTheme.fonts.labelSmall, fontFamily: bodyFamily },

  bodyLarge: { ...MD3LightTheme.fonts.bodyLarge, fontFamily: bodyFamily },
  bodyMedium: { ...MD3LightTheme.fonts.bodyMedium, fontFamily: bodyFamily },
  bodySmall: { ...MD3LightTheme.fonts.bodySmall, fontFamily: bodyFamily },
};

export const theme = {
  ...MD3LightTheme,
  roundness: 10,
  colors: {
    ...MD3LightTheme.colors,
    background: "#F5F9FA", // very light gray (app background)
    primary: "#8C8C8C", // medium gray (primary button background)
    secondary: "#D9D9D9",
    disabled: "#D1D1D6", // medium gray (disabled text for date figures not selected on calendar)
    onSurface: "#444964", // dark gray (default text on surface)
    warning: "#F56767", // soft red (warning state)
    fallback: "#f5f9fa", // grey fallback for tasks without labels
  },
  fonts: configureFonts({ config: fonts }),
};
export type AppTheme = typeof theme;
