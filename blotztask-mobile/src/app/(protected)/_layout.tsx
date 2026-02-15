import { useTrackActiveUser5s } from "@/feature/auth/analytics/useTrackActiveUser5s";
import { useLanguageInit } from "@/shared/hooks/useLanguageInit";
import { Stack } from "expo-router";
import { usePostHog } from "posthog-react-native";

export default function ProtectedLayout() {
  const posthog = usePostHog();

  useLanguageInit();
  useTrackActiveUser5s(posthog);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />

      <Stack.Screen name="task-details" options={{ headerShown: false }} />
      <Stack.Screen
        name="task-edit"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerTintColor: "#8E8E93",
          headerBackButtonDisplayMode: "minimal",
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
        name="new-ai-chat-hub"
        options={{
          headerShown: false,
          presentation: "transparentModal",
          animation: "fade",
          contentStyle: { backgroundColor: "rgba(0,0,0,0.4)" },
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
        }}
      />
    </Stack>
  );
}
