import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
import { Baloo2_400Regular, Baloo2_700Bold, useFonts } from "@expo-google-fonts/baloo-2";
import { Stack } from "expo-router";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import React from "react";
import { Auth0Provider } from "react-native-auth0";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";

export default function RootLayout() {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;
  useFonts({
    BalooRegular: Baloo2_400Regular,
    BalooBold: Baloo2_700Bold,
  });

  return (
    <Auth0Provider domain={domain} clientId={clientId}>
      <GestureHandlerRootView>
        <BottomSheetModalProvider>
          <PaperProvider theme={theme}>
            <SafeAreaProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(protected)" options={{ headerShown: false }} />
              </Stack>
            </SafeAreaProvider>
          </PaperProvider>
        </BottomSheetModalProvider>
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
