import * as SecureStore from "expo-secure-store";
import { useAuth0 } from "react-native-auth0";
import { useAuth } from "./useAuth";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";

export function useLogout() {
  const router = useRouter();
  const { clearSession, clearCredentials } = useAuth0();
  const { clearAuthState } = useAuth();
  const qc = useQueryClient();

  return async () => {
    // Clear auth cache immediately so dependent queries stop
    clearAuthState();
    qc.clear();
    router.replace("/");

    try {
      await Promise.allSettled([
        SecureStore.deleteItemAsync("AUTH_TOKEN_KEY"),
        SecureStore.deleteItemAsync("REFRESH_TOKEN_KEY"),
      ]);
      await clearCredentials();
      console.log("🎯 clear credentials successfully");
      await clearSession();
      console.log("🎯 clear session successfully");
    } catch (e) {
      console.log("clearSession error:", e);
    }
  };
}
