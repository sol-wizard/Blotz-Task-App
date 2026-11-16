import { apiClient } from "@/shared/services/api/client";

type TranscribeFeedbackResponse = {
  text: string;
};

// Only the text comes back; the backend does not keep the recording.
export const transcribeFeedbackAudio = async (uri: string): Promise<string> => {
  const formData = new FormData();
  // Same file name and type the AI hub uses for the recorder's m4a output.
  const file = { uri, name: "audio.m4a", type: "audio/mp4" };
  formData.append("audio", file as unknown as Blob);

  const response = await apiClient.post<TranscribeFeedbackResponse>(
    "/feedback/transcribe",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  return response.text;
};
