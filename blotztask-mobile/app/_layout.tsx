import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css"; // If using Expo Web / Tailwind
import { theme } from "../constants/theme";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />  
      </PaperProvider>
    </SafeAreaProvider>
  );
}
