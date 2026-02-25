import { apiClient } from "@/shared/services/api/client";
import { SpeechTranscribeResponseDTO } from "../models/speech-transcribe-response-dto";

const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/speech/transcribe`;

export async function transcribeAudioFile(params: {
  uri: string;
  fileName?: string;
  mimeType?: string;
}): Promise<string> {
  const formData = new FormData();
  formData.append("audio", {
    uri: params.uri,
    name: params.fileName ?? "speech.wav",
    type: params.mimeType ?? "audio/wav",
  } as any);

  const response = await apiClient.post<SpeechTranscribeResponseDTO>(url, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  const combined = response.combinedPhrases?.map((v) => v.text).filter(Boolean).join(" ").trim();
  if (combined) return combined;

  const phraseText = response.phrases?.map((v) => v.text).filter(Boolean).join(" ").trim();
  return phraseText;
}
