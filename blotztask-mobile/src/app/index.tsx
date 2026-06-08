import { Redirect } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/shared/hooks/useAuth";
import { useUpdateCheck, UpdateCheckStatus } from "@/shared/hooks/useUpdateCheck";
import LoadingScreen from "@/shared/components/loading-screen";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";

SplashScreen.preventAutoHideAsync();

// Configure notification handling
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const isBadge = notification.request.content.data?.type === "badge";
    return {
      shouldPlaySound: false,
      shouldSetBadge: false,
      shouldShowBanner: !isBadge,
      shouldShowList: !isBadge,
    };
  },
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
  const updateCheck = useUpdateCheck();

  const isReady = !isAuthLoading && updateCheck.status !== UpdateCheckStatus.Pending;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  if (!isReady) {
    return <LoadingScreen />;
  }
  if (updateCheck.status === UpdateCheckStatus.Outdated) {
    return (
      <Redirect
        href={{ pathname: "/update-required", params: { storeUrl: updateCheck.storeUrl } }}
      />
    );
  }
  if (updateCheck.status === UpdateCheckStatus.ForceUpdate) {
    return (
      <Redirect
        href={{
          pathname: "/update-required",
          params: { storeUrl: updateCheck.storeUrl, forced: "true" },
        }}
      />
    );
  }

  if (isAuthenticated) {
    return <Redirect href="/(protected)" />;
  }

  return <Redirect href="/(auth)/signin" />;
}
