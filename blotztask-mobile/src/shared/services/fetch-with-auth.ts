import { AUTH_TOKEN_KEY } from "@/shared/constants/token-key";
import * as SecureStore from "expo-secure-store";

export const fetchWithAuth = async <T>(
  url: string,
  options: RequestInit = {}
): Promise<T> => {
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
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get("content-type");
    let data: any;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return data as T;
  } catch (error) {
    console.error("fetchWithAuth error:", error);
    throw error;
  }
};
