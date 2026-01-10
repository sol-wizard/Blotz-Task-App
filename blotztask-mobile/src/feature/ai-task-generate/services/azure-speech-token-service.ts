import { apiClient } from "@/shared/services/api/client";
import { AzureSpeechTokenDTO } from "../models/azure-speech-token-dto";

export async function fetchAzureSpeechToken(): Promise<AzureSpeechTokenDTO> {
  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/speech/token`;

  try {
    const res = await apiClient.get<AzureSpeechTokenDTO>(url);
    console.log("Fetched Azure Speech token:", res);
    return res;
  } catch (e) {
    throw new Error("Failed to fetch Azure Speech token.");
  }
}
