import { apiClient } from "@/shared/services/api/client";

export async function fetchAzureSpeechToken(): Promise<string> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/api/speech/token`;

  try {
    const res = await apiClient.get<string>(url);
    return res;
  } catch (e) {
    throw new Error("Failed to fetch Azure Speech token.");
  }
}
