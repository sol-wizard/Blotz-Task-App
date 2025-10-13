import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
/* eslint-disable camelcase */
import {
  Baloo2_600SemiBold,
  Baloo2_700Bold,
  Baloo2_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/baloo-2";
import { Inter_300Light, Inter_700Bold } from "@expo-google-fonts/inter";
/* eslint-enable camelcase */
import { Stack } from "expo-router";
import { PaperProvider, Portal } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import React from "react";
import { Auth0Provider } from "react-native-auth0";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { theme } from "@/shared/constants/theme";

export default function RootLayout() {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

  /* eslint-disable camelcase */
  useFonts({
    BalooRegular: Baloo2_600SemiBold,
    BalooBold: Baloo2_700Bold,
    BalooExtraBold: Baloo2_800ExtraBold,
    InterThin: Inter_300Light,
    InterBold: Inter_700Bold,
  });
  /* eslint-enable camelcase */

  return (
    <Auth0Provider domain={domain} clientId={clientId}>
      <GestureHandlerRootView>
        <PaperProvider theme={theme}>
          <BottomSheetModalProvider>
            <Portal.Host>
              <SafeAreaProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(protected)" options={{ headerShown: false }} />
                </Stack>
              </SafeAreaProvider>
            </Portal.Host>
          </BottomSheetModalProvider>
        </PaperProvider>
      </GestureHandlerRootView>
    </Auth0Provider>
  );
}
