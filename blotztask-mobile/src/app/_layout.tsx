import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";
/* eslint-disable camelcase */
import {
  Baloo2_400Regular,
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
import { PostHogProvider } from "posthog-react-native";
import "../../global.css";
import React from "react";
import { Auth0Provider } from "react-native-auth0";
import { theme } from "@/shared/constants/theme";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/shared/util/queryClient";
import * as Sentry from "@sentry/react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

export default function RootLayout() {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

  /* eslint-disable camelcase */
  useFonts({
    BalooThin: Baloo2_400Regular,
    BalooRegular: Baloo2_600SemiBold,
    BalooBold: Baloo2_700Bold,
    BalooExtraBold: Baloo2_800ExtraBold,
    InterThin: Inter_300Light,
    InterBold: Inter_700Bold,
  });
  Sentry.init({
    dsn: "https://776f7bb0f485962be714d1ad719ff46e@o4510303768805376.ingest.us.sentry.io/4510303770902528",
    sendDefaultPii: true,
    enableNative: true,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1,
    enableAutoSessionTracking: true,
    integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],
  });

  return (
    <Auth0Provider domain={domain} clientId={clientId}>
      <PostHogProvider
        apiKey={process.env.EXPO_PUBLIC_POSTHOG_API_KEY}
        options={{
          host: "https://us.i.posthog.com",
          enableSessionReplay: true,
        }}
        autocapture
      >
        <GestureHandlerRootView>
          <QueryClientProvider client={queryClient}>
            <PaperProvider theme={theme}>
              <Portal.Host>
                <SafeAreaProvider>
                  <KeyboardProvider>
                    <Stack screenOptions={{ headerShown: false }}>
                      <Stack.Screen name="index" options={{ headerShown: false }} />
                      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                      <Stack.Screen name="(protected)" options={{ headerShown: false }} />
                    </Stack>
                  </KeyboardProvider>
                </SafeAreaProvider>
              </Portal.Host>
            </PaperProvider>
          </QueryClientProvider>
        </GestureHandlerRootView>
      </PostHogProvider>
    </Auth0Provider>
  );
}
