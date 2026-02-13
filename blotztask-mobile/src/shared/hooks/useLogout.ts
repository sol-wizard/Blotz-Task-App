import * as SecureStore from "expo-secure-store";
import { useAuth0 } from "react-native-auth0";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "../constants/token-key";
import { usePostHog } from "posthog-react-native";

export function useLogout() {
  const router = useRouter();
  const { clearSession, clearCredentials } = useAuth0();
  const { clearAuthState } = useAuth();
  const qc = useQueryClient();
  const posthog = usePostHog();

  return async () => {
    // Clear auth cache immediately so dependent queries stop
    await clearAuthState();
    qc.clear();

    try {
      await Promise.allSettled([
        SecureStore.deleteItemAsync(AUTH_TOKEN_KEY),
        SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
      ]);
      await clearCredentials();
      console.log("🎯 clear credentials successfully");
      await clearSession();
      console.log("🎯 clear session successfully");
      posthog.reset();
      router.replace("/(auth)/signin");
    } catch (e) {
      console.log("clearSession error:", e);
    }
  };
}
