import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
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

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setIsAiGenerating(true);
    if (connection) {
      try {
        await signalRService.invoke(connection, "SendMessage", "User", text);
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

  const cancelGenerationHandler = async () => {
    console.log("CANCEL pressed at", Date.now());
    if (!connection) return;

    try {
      await signalRService.invoke(connection, "CancelGeneration");
      console.log("CANCEL invoke resolved at", Date.now());
    } catch (e) {
      console.error("CancelGeneration invoke failed:", e);
    } finally {
      setModalType("input");
      setIsAiGenerating(false);
      setAiGeneratedMessage(undefined);
    }
  };

  useEffect(() => {
    let newConnection: signalR.HubConnection | null = null;
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
    cancelGenerationHandler,
  };
}
