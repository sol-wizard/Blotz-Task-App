import * as SecureStore from "expo-secure-store";
import Auth0 from "react-native-auth0";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";
import { AUTH_CONFIG } from "./config";

const auth0 = new Auth0(AUTH_CONFIG);

export async function getAuthToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setAuthToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

let refreshTokenPromise: Promise<string> | null = null;

export async function refreshToken(): Promise<string> {
  if (refreshTokenPromise) {
    console.log("wait for ongoing refresh token");
    return refreshTokenPromise;
  }

  refreshTokenPromise = (async () => {
    console.log("starts refresh token!");

    const refreshTokenValue = await getRefreshToken();
    if (!refreshTokenValue) {
      throw new Error("No refresh token available");
    }

    const credentials = await auth0.auth.refreshToken({
      refreshToken: refreshTokenValue,
    });

    console.log("get new tokens");

    await setAuthToken(credentials.accessToken);
    if (credentials.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, credentials.refreshToken);
    }

    return credentials.accessToken;
  })();

  try {
    return await refreshTokenPromise;
  } finally {
    refreshTokenPromise = null;
  }
}
