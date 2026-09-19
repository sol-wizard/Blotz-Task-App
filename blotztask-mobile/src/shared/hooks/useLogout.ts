import { useAuth0 } from "react-native-auth0";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
      analytics.resetUser();
      router.replace("/(auth)/signin");
    } catch (e) {
      console.log("clearSession error:", e);
    }
  };
}
