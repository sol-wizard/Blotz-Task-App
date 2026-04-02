import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { File as ExpoFile } from "expo-file-system";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { AiResultMessageDTO } from "../models/ai-result-message-dto";

export function useAiTaskGenerator({
  setIsAiGenerating,
  setModalType,
}: {
  setIsAiGenerating: (v: boolean) => void;
  setModalType: (type: BottomSheetType) => void;
}) {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<AiResultMessageDTO>();

  const transcribeAudio = async (uri: string): Promise<string> => {
    if (!connection) throw new Error("Cannot transcribe: Not connected.");

    const arrayBuffer = await new ExpoFile(uri).arrayBuffer();
    const binary = new Uint8Array(arrayBuffer);

    return new Promise((resolve, reject) => {
      const handler = (text: string) => {
        connection.off("ReceiveTranscription", handler);
        resolve(text);
      };
      connection.on("ReceiveTranscription", handler);
      signalRService
        .invoke(connection, "TranscribeAudio", binary)
        .catch((error: unknown) => {
          connection.off("ReceiveTranscription", handler);
          reject(error);
        });
    });
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
        setModalType("input");
      }
    } else {
      console.warn("Cannot send message: Not connected.");
      setIsAiGenerating(false);
      setModalType("input");
    }
  };

  useEffect(() => {
    let newConnection: signalR.HubConnection | null = null;

    const receiveMessageHandler = (receivedAiMessage: AiResultMessageDTO) => {
      setAiGeneratedMessage(receivedAiMessage);
      if (!receivedAiMessage.isSuccess) {
        setIsAiGenerating(false);
        setModalType("input");
      } else {
        setModalType("task-preview");
        setIsAiGenerating(false);
      }
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
            setModalType("input");
            setAiGeneratedMessage(undefined);
            newConnection!.off("ReceiveMessage", receiveMessageHandler);
          })
          .catch((error) => console.error("Error stopping SignalR connection:", error));
      }
    };
  }, []);
  return {
    aiGeneratedMessage,
    sendMessage,
    setAiGeneratedMessage,
    transcribeAudio,
  };
}
