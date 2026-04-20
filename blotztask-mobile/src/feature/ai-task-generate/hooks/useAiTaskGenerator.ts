import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { File as ExpoFile } from "expo-file-system";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

/**
 * AI task generation over SignalR. There are two ways to send input to the hub:
 * - Audio: `submitAudioForTranscription` → `TranscribeAudio` (recording as Base64).
 * - Text: `sendTextMessage` → `SendMessage`.
 * The model replies on `ReceiveMessage`, surfaced as `aiGeneratedMessage`.
 */
const ERROR_CODE_TO_I18N_KEY: Record<string, string> = {
  TranscriptionFailed: "errors.transcriptionFailed",
  EmptyAudio: "errors.emptyAudio",
  TokenLimited: "errors.tokenLimited",
  BlockedByContentFilter: "errors.contentFilter",
  Canceled: "errors.canceled",
  NoTasksExtracted: "errors.noTasksExtracted",
};

export function useAiTaskGenerator({
  setIsAiGenerating,
}: {
  setIsAiGenerating: (v: boolean) => void;
}) {
  const { t } = useTranslation("aiTaskGenerate");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<AiResultMessageDTO>();
  const [interimTranscript, setInterimTranscript] = useState<string | undefined>();

  const submitAudioForTranscription = async (uri: string): Promise<void> => {
    if (!connection) throw new Error("Cannot submit audio: not connected.");

    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    setInterimTranscript(undefined);
    setIsAiGenerating(true);

    try {
      await signalRService.invoke(connection, "TranscribeAudio", base64);
    } catch (error) {
      console.error("TranscribeAudio invocation failed:", error);
      setIsAiGenerating(false);
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  const sendTextMessage = async (text: string) => {
    if (!text.trim() || !connection) return;

    setInterimTranscript(undefined);
    setIsAiGenerating(true);
    try {
      await signalRService.invoke(connection, "SendMessage", text);
    } catch (error) {
      console.error("SendMessage invocation failed:", error);
      setIsAiGenerating(false);
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  const receiveMessageHandler = (receivedAiMessage: AiResultMessageDTO) => {
    setInterimTranscript(undefined);
    setIsAiGenerating(false);

    if (!receivedAiMessage.isSuccess) {
      const i18nKey = ERROR_CODE_TO_I18N_KEY[receivedAiMessage.errorCode ?? ""] ?? "errors.default";
      Toast.show({ type: "error", text1: t(i18nKey) });
      return;
    }

    setAiGeneratedMessage(receivedAiMessage);
  };

  useEffect(() => {
    let conn: signalR.HubConnection | null = null;

    signalRService
      .createConnection()
      .then((newConn) => {
        conn = newConn;
        setConnection(conn);
        conn.on("ReceiveMessage", receiveMessageHandler);
        conn.on("ReceiveTranscript", (transcript: string) => setInterimTranscript(transcript));
        return conn.start();
      })
      .catch((error) => console.error("Error connecting to SignalR:", error));

    return () => {
      if (conn) {
        conn.off("ReceiveMessage", receiveMessageHandler);
        conn.off("ReceiveTranscript");
        conn.stop().catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, []);

  return {
    aiGeneratedMessage,
    interimTranscript,
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
