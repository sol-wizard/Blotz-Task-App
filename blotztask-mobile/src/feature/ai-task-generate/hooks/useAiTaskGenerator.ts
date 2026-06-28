/* eslint-disable camelcase */
import { useCallback, useEffect, useRef, useState } from "react";
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
};

const CONNECTION_READY_TIMEOUT_MS = 10_000;
const CONNECTION_NOT_READY_ERROR_CODE = "ConnectionNotReady";

type ConnectionReadyWaiter = {
  resolve: (connection: signalR.HubConnection) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
};

export function useAiTaskGenerator({
  setIsAiGenerating,
}: {
  setIsAiGenerating: (v: boolean) => void;
}) {
  const { t } = useTranslation("aiTaskGenerate");
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isConnectionReady, setIsConnectionReady] = useState(false);
  const [transcript, setTranscript] = useState<string | undefined>();
  const [streamedTasks, setStreamedTasks] = useState<ExtractedTaskDTO[]>([]);
  const [streamedNotes, setStreamedNotes] = useState<AiNoteDTO[]>([]);
  const [turns, setTurns] = useState<AiTaskGenerationTurn[]>([]);
  const requestStartedAtRef = useRef<number | null>(null);
  const pendingInputModeRef = useRef<AiTaskInputMode | null>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const connectionReadyWaitersRef = useRef<ConnectionReadyWaiter[]>([]);

  const resolveConnectionReadyWaiters = useCallback((readyConnection: signalR.HubConnection) => {
    const waiters = connectionReadyWaitersRef.current;
    connectionReadyWaitersRef.current = [];
    waiters.forEach((waiter) => {
      clearTimeout(waiter.timeoutId);
      waiter.resolve(readyConnection);
    });
  }, []);

  const rejectConnectionReadyWaiters = useCallback((error: Error) => {
    const waiters = connectionReadyWaitersRef.current;
    connectionReadyWaitersRef.current = [];
    waiters.forEach((waiter) => {
      clearTimeout(waiter.timeoutId);
      waiter.reject(error);
    });
  }, []);

  const waitForConnectionReady = useCallback((): Promise<signalR.HubConnection> => {
    const readyConnection = connectionRef.current;
    if (readyConnection?.state === signalR.HubConnectionState.Connected) {
      return Promise.resolve(readyConnection);
    }

    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        connectionReadyWaitersRef.current = connectionReadyWaitersRef.current.filter(
          (waiter) => waiter.timeoutId !== timeoutId,
        );
        reject(new Error(CONNECTION_NOT_READY_ERROR_CODE));
      }, CONNECTION_READY_TIMEOUT_MS);

      connectionReadyWaitersRef.current.push({ resolve, reject, timeoutId });
    });
  }, []);

  const submitAudioForTranscription = async (uri: string): Promise<void> => {
    const readyConnection = await waitForConnectionReady();

    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const base64 = arrayBufferToBase64(arrayBuffer);

    setTranscript(undefined);
    setIsAiGenerating(true);
    requestStartedAtRef.current = Date.now();
    pendingInputModeRef.current = "voice";

    try {
      await signalRService.invoke(readyConnection, "TranscribeAudio", base64);
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
    if (
      !text.trim() ||
      !connection ||
      !isConnectionReady ||
      connection.state !== signalR.HubConnectionState.Connected
    ) {
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

  const generationCompleteHandler = useCallback(
    (result: AiResultMessageDTO) => {
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
    },
    [setIsAiGenerating],
  );

  const generationErrorHandler = useCallback(
    (error: AiGenerationErrorDTO) => {
      setTranscript(undefined);
      setIsAiGenerating(false);
      const startedAt = requestStartedAtRef.current;
      requestStartedAtRef.current = null;
      const inputMode = pendingInputModeRef.current;
      pendingInputModeRef.current = null;
      setStreamedTasks([]);
      setStreamedNotes([]);

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
    },
    [setIsAiGenerating, t],
  );

  useEffect(() => {
    let conn: signalR.HubConnection | null = null;
    let isDisposed = false;

    signalRService
      .createConnection()
      .then(async (newConn) => {
        conn = newConn;
        connectionRef.current = conn;
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

        conn.onreconnecting(() => {
          setIsConnectionReady(false);
        });
        conn.onreconnected(() => {
          setIsConnectionReady(true);
          if (conn) {
            resolveConnectionReadyWaiters(conn);
          }
        });
        conn.onclose(() => {
          setIsConnectionReady(false);
          rejectConnectionReadyWaiters(new Error(CONNECTION_NOT_READY_ERROR_CODE));
        });

        await conn.start();
        if (isDisposed) {
          await conn.stop();
          return;
        }

        setConnection(conn);
        setIsConnectionReady(true);
        resolveConnectionReadyWaiters(conn);
      })
      .catch((error) => {
        console.error("Error connecting to SignalR:", error);
        rejectConnectionReadyWaiters(new Error(CONNECTION_NOT_READY_ERROR_CODE));
      });

    return () => {
      isDisposed = true;
      setIsConnectionReady(false);
      connectionRef.current = null;
      rejectConnectionReadyWaiters(new Error(CONNECTION_NOT_READY_ERROR_CODE));
      if (conn) {
        conn.off("ReceiveGenerationResult", generationCompleteHandler);
        conn.off("ReceiveGenerationError", generationErrorHandler);
        conn.off("ReceiveTranscript");
        conn.off("ReceiveTaskExtracted");
        conn.off("ReceiveNoteExtracted");
        conn.stop().catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, [
    generationCompleteHandler,
    generationErrorHandler,
    rejectConnectionReadyWaiters,
    resolveConnectionReadyWaiters,
  ]);

  return {
    transcript,
    streamedTasks,
    streamedNotes,
    turns,
    isConnectionReady,
    submitAudioForTranscription,
    sendTextMessage,
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
