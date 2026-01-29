import { systemPreferredLanguage } from "@/feature/auth/utils/system-preferred-language";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import LoadingScreen from "@/shared/components/ui/loading-screen";
import { theme } from "@/shared/constants/theme";
import { Stack } from "expo-router";
import { useEffect } from "react";

export default function ProtectedLayout() {
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();
  const { updateUserPreferences } = useUserPreferencesMutation();

  useEffect(() => {
    if (userPreferences && userPreferences.preferredLanguage !== systemPreferredLanguage) {
      updateUserPreferences({
        ...userPreferences!,
        preferredLanguage: systemPreferredLanguage,
      });
    }
  }, [userPreferences?.preferredLanguage]);

  if (isUserPreferencesLoading) {
    return <LoadingScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="settings" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />

      <Stack.Screen
        name="task-details"
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
        name="notes"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerTitle: "",
          headerBackVisible: true,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.secondary,
          headerBackButtonDisplayMode: "minimal",
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
    </Stack>
  );
}
