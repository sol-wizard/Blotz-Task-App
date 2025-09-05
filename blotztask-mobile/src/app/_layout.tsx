<<<<<<< HEAD
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

import { Stack } from "expo-router";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import React from "react";
import { Auth0Provider } from "react-native-auth0";

import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
=======
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import 'react-native-reanimated'
import { Stack } from 'expo-router'
import { MD3LightTheme, PaperProvider } from 'react-native-paper'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import '../../global.css'
import React from 'react'
>>>>>>> b3808c0 (Edit task UI (#461))

export default function RootLayout() {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

  return (
    <Auth0Provider domain={domain} clientId={clientId}>
      <GestureHandlerRootView>
        <PaperProvider theme={theme}>
          <SafeAreaProvider>
            <BottomSheetModalProvider>
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="index" options={{ headerShown: false }} />
                <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                <Stack.Screen name="(protected)" options={{ headerShown: false }} />
              </Stack>
            </BottomSheetModalProvider>
          </SafeAreaProvider>
        </PaperProvider>
<<<<<<< HEAD
      </GestureHandlerRootView>
    </Auth0Provider>
  );
=======
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
>>>>>>> b3808c0 (Edit task UI (#461))
}

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#6200ee',
  },
}
