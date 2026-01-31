const headingFamily = "Baloo-Bold";
const headingFamilySemibold = "Baloo-SemiBold";
const bodyFamily = "Baloo2-Regular";
const bodyFamilyMedium = "Baloo2-Medium";

export const theme = {
  roundness: 10,
  colors: {
    background: "#F5F9FA",
    primary: "#8C8C8C",
    secondary: "#D9D9D9",
    disabled: "#D1D1D6",
    onSurface: "#444964",
    warning: "#F56767",
    fallback: "#f5f9fa",
    highlight: "#9AD513",
  },
  fonts: {
    headingFamily,
    headingFamilySemibold,
    bodyFamily,
    bodyFamilyMedium,
  },
};
export type AppTheme = typeof theme;
