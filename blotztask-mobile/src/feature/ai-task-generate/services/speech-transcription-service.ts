import { apiClient } from "@/shared/services/api/client";

const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/speech/transcribe`;

export async function transcribeAudioFile(params: { uri: string }): Promise<string> {
  const formData = new FormData();
  formData.append("audio", {
    uri: params.uri,
    name: "speech.wav",
    type: "audio/wav",
  } as any);

  const response = await apiClient.post<string>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response;
}
