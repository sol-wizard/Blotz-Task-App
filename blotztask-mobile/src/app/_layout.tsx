import { Stack } from "expo-router";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import React from "react";
import { AuthProvider } from "@/feature/auth/auth-provider";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen
              name="chatScreen"
              options={{
                headerShown: true,
                title: "AIChat",
                headerBackVisible: true,
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="notification"
              options={{
                headerShown: true,
                headerBackVisible: true,
                headerBackTitle: "Back",
              }}
            />
            <Stack.Screen
              name="signalRConnection"
              options={{
                headerShown: true,
                headerBackVisible: true,
                headerBackTitle: "Back",
              }}
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
