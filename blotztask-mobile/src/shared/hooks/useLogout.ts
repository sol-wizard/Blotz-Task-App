import { useAuth0 } from "react-native-auth0";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import * as Sentry from "@sentry/react-native";
import { analytics } from "@/shared/services/analytics";
import { Platform } from "react-native";

export function useLogout() {
  const router = useRouter();
  const { clearSession, clearCredentials } = useAuth0();
  const { clearAuthState } = useAuth();
  const qc = useQueryClient();

  return async () => {
    // Clear auth cache immediately so dependent queries stop
    await clearAuthState();
    qc.clear();

    // Reset analytics identity before anything that can fail. `clearSession()` opens the
    // browser (and a system prompt on iOS); when the user dismisses it the call rejects,
    // and a reset placed after it never ran — the next account to sign in on this phone
    // had its events attributed to the previous one.
    analytics.resetUser();

    try {
      await clearCredentials();
      console.log("🎯 clear credentials successfully");
      // iOS logs in with ephemeralSession, so there is no shared Safari cookie to clear.
      // Calling clearSession() there only shows the "Wants to Use auth0.com to Sign In"
      // alert on the way out. Android still needs it.
      if (Platform.OS !== "ios") {
        await clearSession();
        console.log("🎯 clear session successfully");
      }
    } catch (e) {
      console.log("clearSession error:", e);
      // Not an error worth an alert: the local session is already gone and the guard will
      // route to sign-in. Kept as a breadcrumb so a later login issue on this device shows
      // that the browser session was left in place.
      Sentry.addBreadcrumb({
        category: "auth",
        level: "info",
        message: "logout: clearSession did not complete",
        data: { cause: String(e) },
      });
    }

    router.replace("/(auth)/signin");
  };
}
