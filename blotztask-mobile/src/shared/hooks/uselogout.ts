import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";

export function useLogout() {
  const router = useRouter();

  return async () => {
    try {
      await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
      router.replace("/onboarding");
    } catch (e) {
      console.log("Logout error:", e);
    }
  };
}
