import * as SecureStore from "expo-secure-store";
import Auth0 from "react-native-auth0";
import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";
import { AUTH_CONFIG } from "./config";

const auth0 = new Auth0(AUTH_CONFIG);

let isRefreshing = false;
let failedQueue: {
  resolve: (token: string) => void;
  reject: (error: any) => void;
}[] = [];

export async function getToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(AUTH_TOKEN_KEY, token);
}

export async function getRefreshToken(): Promise<string | null> {
  return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function clearTokens(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_TOKEN_KEY);
  await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
}

export function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const exp = payload.exp * 1000;
    const buffer = 5 * 60 * 1000; // 5 minutes
    return Date.now() >= exp - buffer;
  } catch {
    return true;
  }
}

export async function refreshToken(): Promise<string> {
  const refreshTokenValue = await getRefreshToken();

  if (!refreshTokenValue) {
    throw new Error("No refresh token available");
  }

  const credentials = await auth0.auth.refreshToken({ refreshToken: refreshTokenValue });

  if (!credentials.accessToken) {
    throw new Error("Failed to refresh token");
  }

  await setToken(credentials.accessToken);

  if (credentials.refreshToken) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, credentials.refreshToken);
  }

  return credentials.accessToken;
}

export async function getValidToken(): Promise<string | null> {
  let token = await getToken();

  if (!token) {
    return null;
  }

  if (isTokenExpired(token)) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        token = await refreshToken();
        processQueue(null, token);
      } catch (error) {
        processQueue(error, null);
        throw error;
      } finally {
        isRefreshing = false;
      }
    } else {
      // Wait for ongoing refresh
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (newToken: string) => resolve(newToken),
          reject: (err: any) => reject(err),
        });
      });
    }
  }

  return token;
}

function processQueue(error: any = null, token: string | null = null): void {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
    } else {
      promise.resolve(token!);
    }
  });
  failedQueue = [];
}
