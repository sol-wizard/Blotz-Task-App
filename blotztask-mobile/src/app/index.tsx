import { Redirect } from "expo-router";
import { View, ActivityIndicator } from "react-native";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/shared/hooks/useAuth";
import { useUserProfile } from "@/shared/hooks/useUserProfile";

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

  // Determine overall loading state
  const isLoading = isAuthLoading || (isAuthenticated && isUserProfileLoading);

  if (isLoading) {
    return <LoadingScreen />;
  }

  // Authenticated users go to protected routes
  if (isAuthenticated && userProfile) {
    const destination = userProfile.isOnBoarded 
      ? "/(protected)" 
      : "/(protected)/onboarding";
    return <Redirect href={destination} />;
  }

  // Unauthenticated users go to auth flow
  return <Redirect href="/(auth)/onboarding" />;
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color="#667eea" />
    </View>
  );
}
