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

  useEffect(() => {
    let newConnection: signalR.HubConnection | null = null;

    const receiveMessageHandler = (receivedAiMessage: AiResultMessageDTO) => {
      setAiGeneratedMessage(receivedAiMessage);
      setIsAiGenerating(false);
    };

    const startConnection = async () => {
      try {
        newConnection = await signalRService.createConnection();
        setConnection(newConnection);
        await newConnection.start();
        newConnection.on("ReceiveMessage", receiveMessageHandler);
        console.log("Connected to SignalR hub!");
      } catch (error) {
        console.error("Error connecting to SignalR:", error);
      }
    };
    startConnection();
    return () => {
      if (newConnection) {
        newConnection
          .stop()
          .then(() => {
            console.log("SignalR Connection Stopped.");
            setAiGeneratedMessage(undefined);
            newConnection!.off("ReceiveMessage", receiveMessageHandler);
          })
          .catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, []);

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

  return {
    aiGeneratedMessage,
    transcribeAudio,
    sendMessage,
  };
}
