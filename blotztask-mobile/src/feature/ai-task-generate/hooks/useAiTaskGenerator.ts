/* eslint-disable camelcase */
import { useEffect, useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { File as ExpoFile } from "expo-file-system";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import {
  AiGenerationErrorDTO,
  AiNoteDTO,
  AiResultMessageDTO,
  ExtractedTaskDTO,
} from "../models/ai-result-message-dto";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import type { AiTaskGenerationTurn, AiTaskInputMode } from "@/shared/constants/posthog-events";
import { analytics } from "@/shared/services/analytics";

const ERROR_CODE_TO_I18N_KEY: Record<string, string> = {
  TranscriptionFailed: "errors.transcriptionFailed",
  EmptyAudio: "errors.emptyAudio",
  TokenLimited: "errors.tokenLimited",
  BlockedByContentFilter: "errors.contentFilter",
  Canceled: "errors.canceled",
  NoTasksExtracted: "errors.noTasksExtracted",
  QuotaExceeded: "errors.quotaExceeded",
};

export function useAiTaskGenerator({
  setIsAiGenerating,
}: {
  setIsAiGenerating: (v: boolean) => void;
}) {
  const { t } = useTranslation("aiTaskGenerate");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [streamedTasks, setStreamedTasks] = useState<ExtractedTaskDTO[]>([]);
  const [streamedNotes, setStreamedNotes] = useState<AiNoteDTO[]>([]);
  const [turns, setTurns] = useState<AiTaskGenerationTurn[]>([]);
  const requestStartedAtRef = useRef<number | null>(null);
  const pendingInputModeRef = useRef<AiTaskInputMode | null>(null);

  const submitAudioForTranscription = async (uri: string): Promise<void> => {
    if (!connection || connection.state !== signalR.HubConnectionState.Connected) {
      throw new Error("Cannot submit audio: not connected.");
    }

    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    setTranscript(undefined);
    setIsAiGenerating(true);
    requestStartedAtRef.current = Date.now();
    pendingInputModeRef.current = "voice";

    try {
      await signalRService.invoke(connection, "TranscribeAudio", base64);
    } catch (error) {
      console.error("TranscribeAudio invocation failed:", error);
      setIsAiGenerating(false);
      const startedAt = requestStartedAtRef.current;
      requestStartedAtRef.current = null;
      pendingInputModeRef.current = null;
      analytics.trackAiTaskGenerationFailed({
        inputMode: "voice",
        stage: "transcription",
        errorCode: "NetworkError",
        durationMs: startedAt !== null ? Date.now() - startedAt : undefined,
      });
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  const sendTextMessage = async (text: string) => {
    if (!text.trim() || !connection || connection.state !== signalR.HubConnectionState.Connected) {
      return;
    }

    setTranscript(undefined);
    setIsAiGenerating(true);
    requestStartedAtRef.current = Date.now();
    pendingInputModeRef.current = "text";

    try {
      await signalRService.invoke(connection, "SendMessage", text);
    } catch (error) {
      console.error("SendMessage invocation failed:", error);
      setIsAiGenerating(false);
      const startedAt = requestStartedAtRef.current;
      requestStartedAtRef.current = null;
      pendingInputModeRef.current = null;
      analytics.trackAiTaskGenerationFailed({
        inputMode: "text",
        stage: "send",
        errorCode: "NetworkError",
        durationMs: startedAt !== null ? Date.now() - startedAt : undefined,
      });
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  // Optimistic swipe-to-delete: drop the card immediately, tell the backend to remove it from its
  // draft basket, and roll the card back if the invoke fails (otherwise the next turn's snapshot
  // would resurrect it). No-op when the id is gone or the connection is down.
  const deleteDraftTask = async (id: string) => {
    const index = streamedTasks.findIndex((task) => task.id === id);
    if (index === -1) return;
    const removed = streamedTasks[index];

    setStreamedTasks((prev) => prev.filter((task) => task.id !== id));

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;

    try {
      await signalRService.invoke(connection, "DeleteDraftTask", id);
    } catch (error) {
      console.error("DeleteDraftTask invocation failed:", error);
      setStreamedTasks((prev) => {
        const next = [...prev];
        next.splice(index, 0, removed);
        return next;
      });
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  const deleteDraftNote = async (id: string) => {
    const index = streamedNotes.findIndex((note) => note.id === id);
    if (index === -1) return;
    const removed = streamedNotes[index];

    setStreamedNotes((prev) => prev.filter((note) => note.id !== id));

    if (!connection || connection.state !== signalR.HubConnectionState.Connected) return;

    try {
      await signalRService.invoke(connection, "DeleteDraftNote", id);
    } catch (error) {
      console.error("DeleteDraftNote invocation failed:", error);
      setStreamedNotes((prev) => {
        const next = [...prev];
        next.splice(index, 0, removed);
        return next;
      });
      Toast.show({ type: "error", text1: t("errors.default") });
    }
  };

  const generationCompleteHandler = (result: AiResultMessageDTO) => {
    setTranscript(undefined);
    setIsAiGenerating(false);
    requestStartedAtRef.current = null;
    const inputMode = pendingInputModeRef.current;
    pendingInputModeRef.current = null;
    const inputText = result.userInput;

    if (inputMode && inputText) {
      setTurns((prev) => [...prev, buildTurn(prev.length + 1, inputMode, result)]);
    }

    // Sync to authoritative final list — streaming only covers CreateTask, not RemoveTask/UpdateTask
    setStreamedTasks(result.extractedTasks ?? []);
    setStreamedNotes(result.extractedNotes ?? []);
  };

  const generationErrorHandler = (error: AiGenerationErrorDTO) => {
    setTranscript(undefined);
    setIsAiGenerating(false);
    const startedAt = requestStartedAtRef.current;
    requestStartedAtRef.current = null;
    const inputMode = pendingInputModeRef.current;
    pendingInputModeRef.current = null;
    if (error.errorCode !== "QuotaExceeded") {
      setStreamedTasks([]);
      setStreamedNotes([]);
    }

    analytics.trackAiTaskGenerationFailed({
      inputMode: inputMode ?? "unknown",
      stage:
        error.errorCode === "TranscriptionFailed" || error.errorCode === "EmptyAudio"
          ? "transcription"
          : "generation",
      errorCode: error.errorCode,
      durationMs: startedAt !== null ? Date.now() - startedAt : undefined,
    });

    const i18nKey = ERROR_CODE_TO_I18N_KEY[error.errorCode] ?? "errors.default";
    Toast.show({ type: "error", text1: t(i18nKey) });
  };

  useEffect(() => {
    let conn: signalR.HubConnection | null = null;

    signalRService
      .createConnection()
      .then(async (newConn) => {
        conn = newConn;
        conn.on("ReceiveGenerationResult", generationCompleteHandler);
        conn.on("ReceiveGenerationError", generationErrorHandler);
        conn.on("ReceiveTranscript", (text: string) => {
          setTranscript(text);
        });
        conn.on("ReceiveTaskExtracted", (task: ExtractedTaskDTO) => {
          if (requestStartedAtRef.current == null) return;
          setStreamedTasks((prev) => [...prev, task]);
        });
        conn.on("ReceiveNoteExtracted", (note: AiNoteDTO) => {
          if (requestStartedAtRef.current == null) return;
          setStreamedNotes((prev) => [...prev, note]);
        });

        await conn.start();
        setConnection(conn);
      })
      .catch((error) => console.error("Error connecting to SignalR:", error));

    return () => {
      if (conn) {
        conn.off("ReceiveGenerationResult", generationCompleteHandler);
        conn.off("ReceiveGenerationError", generationErrorHandler);
        conn.off("ReceiveTranscript");
        conn.off("ReceiveTaskExtracted");
        conn.off("ReceiveNoteExtracted");
        conn.stop().catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, []);

  return {
    transcript,
    streamedTasks,
    streamedNotes,
    turns,
    submitAudioForTranscription,
    sendTextMessage,
    deleteDraftTask,
    deleteDraftNote,
  };
}

function buildTurn(
  index: number,
  inputMode: AiTaskInputMode,
  result: AiResultMessageDTO,
): AiTaskGenerationTurn {
  return {
    turn_index: index,
    input_mode: inputMode,
    user_input: result.userInput ?? "",
    generated_tasks: (result.extractedTasks ?? []).map((task) => ({
      title: task.title,
      description: task.description ?? "",
      start_time: task.start_time,
      end_time: task.end_time,
      task_label: task.task_label,
    })),
    generated_notes: (result.extractedNotes ?? []).map((note) => ({
      text: note.text,
    })),
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
