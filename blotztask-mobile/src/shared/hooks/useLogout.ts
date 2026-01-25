import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";
import { useAuth } from "./useAuth";

export function useLogout() {
  const router = useRouter();
  const { clearSession } = useAuth0();
  const { clearAuthState } = useAuth();

  return async () => {
    // Clear auth cache immediately so dependent queries stop
    clearAuthState();
    
    // Navigate to onboarding
    router.replace("/onboarding");
    
    try {
      await Promise.allSettled([
        SecureStore.deleteItemAsync("AUTH_TOKEN_KEY"),
        SecureStore.deleteItemAsync("REFRESH_TOKEN_KEY"),
      ]);
      await clearSession();
      console.log("🎯 clear session successfully");
    } catch (e) {
      console.log("clearSession error:", e);
    }
  };
}
