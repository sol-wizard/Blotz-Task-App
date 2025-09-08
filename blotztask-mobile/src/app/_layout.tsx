import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { Stack } from "expo-router";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import React from "react";
import {Auth0Provider} from 'react-native-auth0';

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function RootLayout() {
  return (
    <Auth0Provider
      domain={"dev-k72xachs0fr6nebp.us.auth0.com"} 
      clientId={"E7QTR6A1pHoihTRqbGQEw3BzO86Yvk6l"}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={theme}>
        <BottomSheetModalProvider>
          <SafeAreaProvider>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(protected)" options={{ headerShown: false }} />
            </Stack>
          </SafeAreaProvider>
        </BottomSheetModalProvider>
      </PaperProvider>
      </GestureHandlerRootView>
    </Auth0Provider>
  );
}

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6200ee",
  },
};
