import { Redirect } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuth } from "@/shared/hooks/useAuth";
import { useUpdateCheck, UpdateCheckStatus } from "@/shared/hooks/useUpdateCheck";
import LoadingScreen from "@/shared/components/loading-screen";
import * as SplashScreen from "expo-splash-screen";
import * as Sentry from "@sentry/react-native";
import { useEffect, useRef } from "react";
import { analytics } from "@/shared/services/analytics";

/**
 * How long the splash may hold before it is reported. Both gates are network-bound: the
 * auth check can wait on an Auth0 token refresh (10 s per host on Android, 60 s on iOS) and
 * the version check on our API (30 s axios timeout), and the version request itself waits
 * for the token first. A user stuck here sees only the splash and reports "stuck loading".
 */
const SLOW_STARTUP_MS = 10_000;

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
  const hasReportedSlowStartup = useRef(false);

  useEffect(() => {
    if (isReady) {
      SplashScreen.hideAsync();
    }
  }, [isReady]);

  // Report a slow splash, naming which gate was still open at the threshold. The timer is
  // anchored to bundle start rather than mount, so re-arming when a gate flips before the
  // threshold re-targets the same absolute moment; the cleanup on `isReady` cancels it for
  // good.
  //
  // Once per launch. A gate flipping *after* the threshold re-runs this effect with a
  // `remaining` that is already negative, which `Math.max` turns into "fire now" — without
  // the ref that second arm would report the same slow startup again under a narrower
  // `waiting_on`. Which gate was the long pole belongs in a completion event carrying both
  // durations, not in a repeat of this warning.
  useEffect(() => {
    if (isReady || hasReportedSlowStartup.current) return;
    const remaining = SLOW_STARTUP_MS - analytics.msSinceLaunch();
    const timer = setTimeout(
      () => {
        hasReportedSlowStartup.current = true;
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
    return () => clearTimeout(timer);
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
