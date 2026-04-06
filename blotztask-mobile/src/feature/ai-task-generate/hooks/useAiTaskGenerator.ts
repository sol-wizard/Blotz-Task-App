import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { File as ExpoFile } from "expo-file-system";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";

/**
 * AI task generation over SignalR. There are two ways to send input to the hub:
 * - Audio: `submitAudioForTranscription` → `TranscribeAudio` (recording as Base64).
 * - Text: `sendTextMessage` → `SendMessage`.
 * The model replies on `ReceiveMessage`, surfaced as `aiGeneratedMessage`.
 */
export function useAiTaskGenerator({
  setIsAiGenerating,
}: {
  setIsAiGenerating: (v: boolean) => void;
}) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<AiResultMessageDTO>();

  const submitAudioForTranscription = async (uri: string): Promise<void> => {
    if (!connection) throw new Error("Cannot submit audio: not connected.");

    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    setIsAiGenerating(true);

    await signalRService.invoke(connection, "TranscribeAudio", base64);
  };

  const sendTextMessage = async (text: string) => {
    if (!text.trim() || !connection) return;

    setIsAiGenerating(true);
    try {
      await signalRService.invoke(connection, "SendMessage", text);
    } catch (error) {
      console.error("Error sending text message:", error);
      setIsAiGenerating(false);
    }
  };

  const receiveMessageHandler = (receivedAiMessage: AiResultMessageDTO) => {
    setAiGeneratedMessage(receivedAiMessage);
    setIsAiGenerating(false);
  };

  useEffect(() => {
    let conn: signalR.HubConnection | null = null;

    signalRService
      .createConnection()
      .then((newConn) => {
        conn = newConn;
        setConnection(conn);
        conn.on("ReceiveMessage", receiveMessageHandler);
        return conn.start();
      })
      .catch((error) => console.error("Error connecting to SignalR:", error));

    return () => {
      if (conn) {
        conn.off("ReceiveMessage", receiveMessageHandler);
        conn.stop().catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, []);

  return {
    aiGeneratedMessage,
    setAiGeneratedMessage,
    submitAudioForTranscription,
    sendTextMessage,
  };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}
