import * as SecureStore from "expo-secure-store";
import { useRouter } from "expo-router";
import { useAuth0 } from "react-native-auth0";

export function useLogout() {
  const router = useRouter();

  return async () => {
    try {
      await Promise.allSettled([
        SecureStore.deleteItemAsync("AUTH_TOKEN_KEY"),
        SecureStore.deleteItemAsync("REFRESH_TOKEN_KEY"),
      ]);
      console.log("🎯 clear session successfully");
    } catch (e) {
      console.log("clearSession error:", e);
    } finally {
      router.replace("/onboarding");
    }
  };
}
