<<<<<<< HEAD
<<<<<<< HEAD
<<<<<<< HEAD
import { GestureHandlerRootView } from "react-native-gesture-handler";
=======
import "react-native-gesture-handler";
>>>>>>> 6eb4676 (Frontend refactor (#467))
=======
import { GestureHandlerRootView } from "react-native-gesture-handler";
>>>>>>> c05ce2d (Unify code style (#462))
import "react-native-reanimated";

import { Stack } from "expo-router";
import { MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "../../global.css";
import React from "react";
<<<<<<< HEAD
<<<<<<< HEAD
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
=======
import { GestureHandlerRootView } from "react-native-gesture-handler";
=======

>>>>>>> c05ce2d (Unify code style (#462))
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
>>>>>>> 6eb4676 (Frontend refactor (#467))

export default function RootLayout() {
  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

  return (
<<<<<<< HEAD
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
=======
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
  );
>>>>>>> 6eb4676 (Frontend refactor (#467))
}

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#6200ee",
  },
};
