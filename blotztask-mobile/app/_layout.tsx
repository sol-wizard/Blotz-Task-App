import { Stack } from "expo-router";
import { PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../global.css"; // If using Expo Web / Tailwind
import React from "react";
import { AuthProvider } from "../contexts/AuthProvider";
import { MD3LightTheme } from "react-native-paper";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="aigenerate" options={{ headerShown: false }} />
            <Stack.Screen
              name="notification"
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="signalRConnection"
              options={{ headerShown: false }}
            />
          </Stack>
        </AuthProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6200ee",
  },
};
