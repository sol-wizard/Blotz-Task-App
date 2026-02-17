import { CONVERSATION_ID_KEY } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { apiClient } from "@/shared/services/api/client";
import AsyncStorage from "@react-native-async-storage/async-storage";

type FastTranscriptionResponse = {
  text: string;
};

export async function sendVoiceFile(uri: string): Promise<string> {
  const conversationId = await AsyncStorage.getItem(CONVERSATION_ID_KEY);
  if (!conversationId) {
    throw new Error("No valid conversationId exists.");
  }

  const url = `${process.env.EXPO_PUBLIC_URL_WITH_API}/speech/fast-transcribe?conversationId=${encodeURIComponent(conversationId)}`;
  const formData = new FormData();

  formData.append("audio", {
    uri,
    name: "audio.wav",
    type: "audio/wav",
  } as any);

  try {
    const res = await apiClient.post<FastTranscriptionResponse>(url, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return res.text;
  } catch (e) {
    console.log("Failed to fast transcribe audio:", e);
    throw new Error("Failed to fast transcribe audio.");
  }
}
