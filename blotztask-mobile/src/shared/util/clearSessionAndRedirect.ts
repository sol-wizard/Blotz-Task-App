import * as SecureStore from "expo-secure-store";
import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";
import { router } from "expo-router";

export async function clearSessionAndRedirect() {
  try {
    await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  } finally {
    router.replace("../(auth)/onboarding");
  }
}
