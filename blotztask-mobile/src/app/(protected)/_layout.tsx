import { useTrackActiveUser5s } from "@/feature/auth/analytics/useTrackActiveUser5s";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";
import { usePushNotificationSetup } from "@/shared/hooks/usePushNotificationSetup";
import { analytics } from "@/shared/services/analytics";
import { Stack } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { useEffect } from "react";

export default function ProtectedLayout() {
  const { user, getCredentials } = useAuth0();

  useEffect(() => {
    if (user?.sub) {
      analytics.identifyUser(user.sub, { email: user.email, name: user.name });
    } else {
      // useAuth0().user is null on app restart even when a valid session exists.
      // getCredentials() restores the Auth0 session into context, which repopulates `user`
      // and triggers this effect to re-run with the real user data.
      void getCredentials();
    }
  }, [user?.sub]);

  useLanguageInit();
  useTrackActiveUser5s();
  usePushNotificationSetup();

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />

      <Stack.Screen name="task-details" options={{ headerShown: false }} />

      <Stack.Screen name="ddl" options={{ headerShown: false }} />

      <Stack.Screen
        name="task-edit"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="task-create"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerTintColor: "#000000",
          headerBackButtonDisplayMode: "minimal",
          headerStyle: {
            backgroundColor: "white",
          },
        }}
      />
      <Stack.Screen
        name="note-editor"
        options={{
          headerShown: false,
        }}
      />

      <Stack.Screen
        name="gashapon-machine"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTransparent: true,
          headerTitle: "",
          headerBackVisible: true,
          headerTintColor: "#000000",
          headerBackButtonDisplayMode: "minimal",
          headerStyle: {
            backgroundColor: "transparent",
          },
        }}
      />
      <Stack.Screen
        name="ai-task-sheet"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "rgba(0,0,0,0.4)" },
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="monthly-calendar"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="pomodoro-focus" options={{ headerShown: false }} />
    </Stack>
  );
}
