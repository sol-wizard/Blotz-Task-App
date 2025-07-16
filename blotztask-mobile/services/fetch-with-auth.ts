import { AUTH_TOKEN_KEY } from "@/src/util/token-key";
import * as SecureStore from "expo-secure-store";

export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  try {
    const token = await SecureStore.getItemAsync(AUTH_TOKEN_KEY);

    if (!token) {
      throw new Error("No access token found.");
    }

    const headers = {
      ...(options.headers || {}),
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      console.error("API error:", response.status);
    }

    return response;
  } catch (error) {
    console.error("fetchWithAuth error:", error);
    throw error;
  }
}
