import { Redirect } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/shared/hooks/useAuth";
import { useUserProfile } from "@/shared/hooks/useUserProfile";
import { useUserPreferencesQuery } from "@/feature/settings/hooks/useUserPreferencesQuery";
import { useUserPreferencesMutation } from "@/feature/settings/hooks/useUserPreferencesMutation";
import { useEffect } from "react";
import { systemPreferredLanguage } from "@/feature/auth/utils/system-preferred-language";
import LoadingScreen from "@/shared/components/ui/loading-screen";

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

  if (isAuthLoading) {
    return <LoadingScreen />;
  }

  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  return <Redirect href="/(auth)/signin" />;
}
