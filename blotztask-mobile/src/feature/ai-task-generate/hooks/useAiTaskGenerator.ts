import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { File as ExpoFile } from "expo-file-system";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { AiNoteDTO, AiResultMessageDTO, ExtractedTaskDTO } from "../models/ai-result-message-dto";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";

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
  const [userInput, setUserInput] = useState<string | undefined>();
  const [transcript, setTranscript] = useState<string | undefined>();
  const [streamedTasks, setStreamedTasks] = useState<ExtractedTaskDTO[]>([]);
  const [streamedNotes, setStreamedNotes] = useState<AiNoteDTO[]>([]);
  const requestStartedAtRef = useRef<number | null>(null);

  const submitAudioForTranscription = async (uri: string): Promise<void> => {
    console.log("🥳 submitAudioForTranscription called with URI:", uri);
    if (!connection) throw new Error("Cannot submit audio: not connected.");

    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    setTranscript(undefined);
    setIsAiGenerating(true);
    requestStartedAtRef.current = Date.now();

    try {
      console.log("🥳 Invoking TranscribeAudio with base64 data.");
      await signalRService.invoke(connection, "TranscribeAudio", base64);
    } catch (error) {
      console.error("TranscribeAudio invocation failed:", error);
      setIsAiGenerating(false);
    }
  };

  const sendTextMessage = async (text: string) => {
    console.log("🥳 sendTextMessage called with text:", text);
    if (!text.trim() || !connection) return;

    setTranscript(undefined);
    setIsAiGenerating(true);
    requestStartedAtRef.current = Date.now();

    try {
      await signalRService.invoke(connection, "SendMessage", text);
    } catch (error) {
      console.error("SendMessage invocation failed:", error);
      setIsAiGenerating(false);
    }
  };

  const generationCompleteHandler = (result: AiResultMessageDTO) => {
    console.log("🥳 generationCompleteHandler called with result:", result);
    setTranscript(undefined);
    setIsAiGenerating(false);
    requestStartedAtRef.current = null;

    if (!result.isSuccess) {
      setStreamedTasks([]);
      setStreamedNotes([]);
      const i18nKey = ERROR_CODE_TO_I18N_KEY[result.errorCode ?? ""] ?? "errors.default";
      Toast.show({ type: "error", text1: t(i18nKey) });
      return;
    }

    // Sync to authoritative final list — streaming only covers CreateTask, not RemoveTask/UpdateTask
    setStreamedTasks(result.extractedTasks ?? []);
    setStreamedNotes(result.extractedNotes ?? []);
    setUserInput(result.userInput);
  };

  useEffect(() => {
    let conn: signalR.HubConnection | null = null;

    signalRService
      .createConnection()
      .then((newConn) => {
        conn = newConn;
        setConnection(conn);
        conn.on("ReceiveGenerationResult", generationCompleteHandler);
        conn.on("ReceiveTranscript", (text: string) => {
          console.log("🥳 ReceiveTranscript called with text:", text);
          setTranscript(text);
        });
        conn.on("ReceiveTaskExtracted", (task: ExtractedTaskDTO) => {
          console.log("🥳 ReceiveTaskExtracted called with task:", task);
          if (requestStartedAtRef.current == null) return;
          setStreamedTasks((prev) => [...prev, task]);
        });
        conn.on("ReceiveNoteExtracted", (note: AiNoteDTO) => {
          console.log("🥳 ReceiveNoteExtracted called with note:", note);
          if (requestStartedAtRef.current == null) return;
          setStreamedNotes((prev) => [...prev, note]);
        });
        return conn.start();
      })
      .catch((error) => console.error("Error connecting to SignalR:", error));

    return () => {
      if (conn) {
        conn.off("ReceiveGenerationResult", generationCompleteHandler);
        conn.off("ReceiveTranscript");
        conn.off("ReceiveTaskExtracted");
        conn.off("ReceiveNoteExtracted");
        conn.stop().catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, []);

  return {
    userInput,
    transcript,
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
