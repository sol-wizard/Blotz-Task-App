import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/shared/hooks/useAuth";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import * as Localization from "expo-localization";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { Language } from "@/shared/models/user-preferences-dto";
import { useEffect } from "react";
import { systemPreferredLanguage } from "@/feature/auth/utils/system-preferred-language";

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

Notifications.setNotificationCategoryAsync("task-reminder", [
  {
    identifier: "MARK_DONE",
    buttonTitle: "Mark as done",
    options: {
      opensAppToForeground: true,
    },
  },
]);

/**
 * Root index route - handles initial navigation based on auth state.
 *
 * Flow:
 * 1. Check authentication status (via useAuth)
 * 2. If authenticated, fetch user profile (via useUserProfile - auto-waits for auth)
 * 3. Route to appropriate screen based on auth + onboarding status
 */
export default function Index() {
  const { isAuthenticated, isAuthLoading } = useAuth();

  const { userProfile, isUserProfileLoading } = useUserProfile();
  const { userPreferences, isUserPreferencesLoading } = useUserPreferencesQuery();

  const { updateUserPreferences, isUpdatingUserPreferences } = useUserPreferencesMutation();

  useEffect(() => {
    if (!isAuthenticated) return;
    if (!userProfile || !userPreferences) return;
    if (userPreferences.preferredLanguage === systemPreferredLanguage) return;

    updateUserPreferences({
      ...userPreferences,
      preferredLanguage: systemPreferredLanguage,
    });
  }, [
    isAuthenticated,
    userPreferences,
    userProfile,
    systemPreferredLanguage,
    updateUserPreferences,
  ]);

  // Determine overall loading state
  const isLoading =
    isAuthLoading ||
    (isAuthenticated &&
      (isUserProfileLoading || isUserPreferencesLoading || isUpdatingUserPreferences));

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Authenticated users go to protected routes
  if (isAuthenticated && userProfile && userPreferences) {
    const destination = userProfile.isOnBoarded ? "/(protected)" : "/(protected)/onboarding";
    return <Redirect href={destination} />;
  }

  // Unauthenticated users go to auth flow
  return <Redirect href="/(auth)/signin" />;
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
  );
}
