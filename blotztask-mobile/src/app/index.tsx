import { Redirect } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/shared/hooks/useAuth";
import { useUpdateCheck, UpdateCheckStatus } from "@/shared/hooks/useUpdateCheck";
import LoadingScreen from "@/shared/components/loading-screen";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import { useEffect } from "react";
import { AppState } from "react-native";
import { analytics } from "@/shared/services/analytics";

/**
 * How long the splash may hold before it is reported. The auth check can wait on an Auth0
 * token refresh (10 s per host on Android, 60 s on iOS). The version gate only reads the
 * policy saved by the last launch; the network check runs in the background. A user stuck
 * here sees only the splash and reports "stuck loading".
 */
const SLOW_STARTUP_MS = 10_000;

// Module scope, so once per process: a later mount of this route (after a login, or any
// `router.replace("/")`) is not a cold start and must not report.
let isSlowStartupWatchArmed = true;

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

  const isUpdateCheckPending = updateCheck.status === UpdateCheckStatus.Pending;
  const isReady = !isAuthLoading && !isUpdateCheckPending;

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Report a slow splash, naming which gate was still open at the threshold. The timer is
  // anchored to bundle start rather than mount, so re-arming when a gate flips before the
  // threshold re-targets the same absolute moment.
  //
  // Disarmed for good once the splash is ready, once reported (a gate flipping *after* the
  // threshold would otherwise report again under a narrower `waiting_on`), and when the app
  // goes to the background: the clock keeps running there, so the wait is not the user's.
  useEffect(() => {
    if (!isSlowStartupWatchArmed) return;
    if (isReady || AppState.currentState === "background") {
      isSlowStartupWatchArmed = false;
      return;
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "background") isSlowStartupWatchArmed = false;
    });
    const remaining = SLOW_STARTUP_MS - analytics.msSinceLaunch();
    const timer = setTimeout(
      () => {
        if (!isSlowStartupWatchArmed) return;
        isSlowStartupWatchArmed = false;
        /* eslint-disable camelcase */
        Sentry.captureMessage("startup_slow", {
          level: "warning",
          tags: {
            waiting_on: isAuthLoading
              ? isUpdateCheckPending
                ? "auth_and_version"
                : "auth"
              : "version",
          },
          extra: { ms_since_launch: analytics.msSinceLaunch() },
        });
        /* eslint-enable camelcase */
      },
      Math.max(remaining, 0),
    );
    return () => {
      clearTimeout(timer);
      subscription.remove();
    };
  }, [isReady, isAuthLoading, isUpdateCheckPending]);

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
    return <Redirect href={{ pathname: "/(protected)", params: { entry: "restore" } }} />;
  }

  return <Redirect href="/(auth)/signin" />;
}
