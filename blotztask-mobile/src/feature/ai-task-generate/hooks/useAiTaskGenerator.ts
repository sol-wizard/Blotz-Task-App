import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { File as ExpoFile } from "expo-file-system";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { AiNoteDTO, AiResultMessageDTO, ExtractedTaskDTO } from "../models/ai-result-message-dto";
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
  const [streamedTasks, setStreamedTasks] = useState<ExtractedTaskDTO[]>([]);
  const [streamedNotes, setStreamedNotes] = useState<AiNoteDTO[]>([]);
  // Tracks the moment the user released the mic (or submitted text), used to log
  // the user-perceived end-to-end latency when ReceiveMessage arrives.
  const requestStartedAtRef = useRef<number | null>(null);

  const submitAudioForTranscription = async (
    uri: string,
    pressReleasedAt: number,
  ): Promise<void> => {
    if (!connection) throw new Error("Cannot submit audio: not connected.");

    const readStart = Date.now();
    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const readEnd = Date.now();
    const base64 = arrayBufferToBase64(arrayBuffer);
    const encodeEnd = Date.now();

    console.log(
      `[VoiceTiming] submitAudio: audioBytes=${arrayBuffer.byteLength} base64Bytes=${base64.length} readMs=${readEnd - readStart} base64EncodeMs=${encodeEnd - readEnd} sinceReleaseMs=${encodeEnd - pressReleasedAt}`,
    );

    setInterimTranscript(undefined);
    setStreamedTasks([]);
    setStreamedNotes([]);
    setIsAiGenerating(true);
    requestStartedAtRef.current = pressReleasedAt;

    try {
      const invokeStart = Date.now();
      await signalRService.invoke(connection, "TranscribeAudio", base64);
      const invokeEnd = Date.now();
      console.log(
        `[VoiceTiming] TranscribeAudio invoke resolved: invokeMs=${invokeEnd - invokeStart} sinceReleaseMs=${invokeEnd - pressReleasedAt}`,
      );
    } catch (error) {
      console.error("TranscribeAudio invocation failed:", error);
      setIsAiGenerating(false);
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  const sendTextMessage = async (text: string) => {
    if (!text.trim() || !connection) return;

    setInterimTranscript(undefined);
    setStreamedTasks([]);
    setStreamedNotes([]);
    setIsAiGenerating(true);
    const sendStart = Date.now();
    requestStartedAtRef.current = sendStart;
    try {
      await signalRService.invoke(connection, "SendMessage", text);
      console.log(
        `[VoiceTiming] SendMessage invoke resolved: invokeMs=${Date.now() - sendStart} chars=${text.length}`,
      );
    } catch (error) {
      console.error("SendMessage invocation failed:", error);
      setIsAiGenerating(false);
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  const receiveMessageHandler = (receivedAiMessage: AiResultMessageDTO) => {
    setInterimTranscript(undefined);
    setStreamedTasks([]);
    setStreamedNotes([]);
    setIsAiGenerating(false);

    const startedAt = requestStartedAtRef.current;
    if (startedAt != null) {
      console.log(
        `[VoiceTiming] ReceiveMessage arrived: totalSinceStartMs=${Date.now() - startedAt} success=${receivedAiMessage.isSuccess} tasks=${receivedAiMessage.extractedTasks?.length ?? 0} notes=${receivedAiMessage.extractedNotes?.length ?? 0}`,
      );
      requestStartedAtRef.current = null;
    }

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
        conn.on("ReceiveTaskExtracted", (task: ExtractedTaskDTO) => {
          if (requestStartedAtRef.current == null) return;
          const sinceStartMs = Date.now() - requestStartedAtRef.current;
          setStreamedTasks((prev) => {
            console.log(`[VoiceTiming] ReceiveTaskExtracted arrived: sinceStartMs=${sinceStartMs} totalStreamedSoFar=${prev.length + 1}`);
            return [...prev, task];
          });
        });
        conn.on("ReceiveNoteExtracted", (note: AiNoteDTO) => {
          if (requestStartedAtRef.current == null) return;
          const sinceStartMs = Date.now() - requestStartedAtRef.current;
          setStreamedNotes((prev) => {
            console.log(`[VoiceTiming] ReceiveNoteExtracted arrived: sinceStartMs=${sinceStartMs} totalStreamedSoFar=${prev.length + 1}`);
            return [...prev, note];
          });
        });
        return conn.start();
      })
      .catch((error) => console.error("Error connecting to SignalR:", error));

    return () => {
      if (conn) {
        conn.off("ReceiveMessage", receiveMessageHandler);
        conn.off("ReceiveTranscript");
        conn.off("ReceiveTaskExtracted");
        conn.off("ReceiveNoteExtracted");
        conn.stop().catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, []);

  return {
    aiGeneratedMessage,
    interimTranscript,
    streamedTasks,
    streamedNotes,
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
