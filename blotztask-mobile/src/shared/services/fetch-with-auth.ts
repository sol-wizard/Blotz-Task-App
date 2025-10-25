import { AUTH_TOKEN_KEY, REFRESH_TOKEN_KEY } from "@/shared/constants/token-key";
import * as SecureStore from "expo-secure-store";
import { clearSessionAndRedirect } from "../util/clearSessionAndRedirect";
import Auth0 from "react-native-auth0";

export const fetchWithAuth = async <T>(url: string, options: RequestInit = {}): Promise<T> => {
  try {
    const accessToken = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (!accessToken) {
      throw new Error("No access token found.");
    }

    const { data, response } = await makeRequest(accessToken, options, url);

    if (response.status === 401 && refreshToken) {
      const { data } = await reFetchWithRefreshToken(url, options, refreshToken);
      return data as T;
    }

    return data as T;
  } catch (error) {
    console.error("fetchWithAuth error:", error);
    throw error;
  }
};

const makeRequest = async (
  token: string,
  options: RequestInit = {},
  url: string,
): Promise<{ data: any; response: Response }> => {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const contentType = response.headers.get("content-type");
  let data: any;

  if (contentType && contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { data, response };
};

export const reFetchWithRefreshToken = async (
  url: string,
  options: RequestInit = {},
  refreshToken: string,
): Promise<{ data: any; response: Response }> => {
  console.log("Access token expired, refreshing…");

  const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
  const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

  const auth0 = new Auth0({ domain, clientId });

  try {
    const newTokens = await auth0.auth.refreshToken({ refreshToken });
    if (!newTokens.accessToken) {
      throw new Error("No access token found when refreshing.");
    }

    await SecureStore.setItemAsync(AUTH_TOKEN_KEY, newTokens.accessToken);
    if (newTokens.refreshToken) {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, newTokens.refreshToken);
    }

    const { data, response } = await makeRequest(newTokens.accessToken, options, url);

    if (response.status === 401) {
      await clearSessionAndRedirect();
    }
    return { data, response };
  } catch (error) {
    console.error("Error refreshing token:", error);
    await clearSessionAndRedirect();
    throw new Error(`Unauthorized: ${url}`);
  }
};
