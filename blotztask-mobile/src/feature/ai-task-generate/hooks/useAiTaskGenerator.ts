import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { File as ExpoFile } from "expo-file-system";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";

export function useAiTaskGenerator({
  setIsAiGenerating,
}: {
  setIsAiGenerating: (v: boolean) => void;
}) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<AiResultMessageDTO>();

  const transcribeAudio = async (uri: string): Promise<void> => {
    if (!connection) throw new Error("Cannot transcribe: Not connected.");

    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);

    setIsAiGenerating(true);

    await signalRService.invoke(connection, "TranscribeAudio", base64);
  };

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setIsAiGenerating(true);
    if (connection) {
      try {
        await signalRService.invoke(connection, "SendMessage", text);
      } catch (error) {
        console.error("Error invoking SendMessage:", error);
        setIsAiGenerating(false);
      }
    } else {
      console.warn("Cannot send message: Not connected.");
      setIsAiGenerating(false);
    }
  };

  const receiveMessageHandler = (receivedAiMessage: AiResultMessageDTO) => {
    setAiGeneratedMessage(receivedAiMessage);
    setIsAiGenerating(false);
  };

  const startConnection = async (
    receiveMessage: (msg: AiResultMessageDTO) => void,
    onConnectionReady: (conn: signalR.HubConnection) => void,
  ) => {
    try {
      const conn = await signalRService.createConnection();
      onConnectionReady(conn);
      await conn.start();
      conn.on("ReceiveMessage", receiveMessage);
      console.log("Connected to SignalR hub!");
      return conn;
    } catch (error) {
      console.error("Error connecting to SignalR:", error);
      return null;
    }
  };

  const stopConnection = (
    conn: signalR.HubConnection,
    receiveMessage: (msg: AiResultMessageDTO) => void,
  ) => {
    conn
      .stop()
      .then(() => {
        console.log("SignalR Connection Stopped.");
        setAiGeneratedMessage(undefined);
        conn.off("ReceiveMessage", receiveMessage);
      })
      .catch((error) => console.error("Error stopping SignalR connection:", error));
  };

  useEffect(() => {
    let newConnection: signalR.HubConnection | null = null;
    startConnection(receiveMessageHandler, (conn) => {
      newConnection = conn;
      setConnection(conn);
    });
    return () => {
      if (newConnection) stopConnection(newConnection, receiveMessageHandler);
    };
  }, []);

  return {
    aiGeneratedMessage,
    setAiGeneratedMessage,
    transcribeAudio,
    sendMessage,
  };
}
