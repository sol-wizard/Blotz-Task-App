import { useAuth0 } from "react-native-auth0";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { analytics } from "@/shared/services/analytics";

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
      await clearSession();
      console.log("🎯 clear session successfully");
      analytics.resetUser();
      router.replace("/(auth)/signin");
    } catch (e) {
      console.log("clearSession error:", e);
    }
  };
}
