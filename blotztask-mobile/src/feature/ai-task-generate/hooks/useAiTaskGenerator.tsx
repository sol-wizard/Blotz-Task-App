import { useState } from "react";
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

  const resetState = () => {
    setAiGeneratedMessage(undefined);
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

  const connect = async () => {
    if (connection && connection.state === signalR.HubConnectionState.Connected) return;
    let newConnection = connection;

    try {
      if (!newConnection) {
        newConnection = await signalRService.createConnection();
        setConnection(newConnection);
      }

      if (!newConnection) return;

      newConnection.off("ReceiveMessage", receiveMessageHandler);
      newConnection.on("ReceiveMessage", receiveMessageHandler);

      if (newConnection.state !== signalR.HubConnectionState.Connected) {
        await newConnection.start();
      }
      console.log("Connected to SignalR hub!");
    } catch (error) {
      console.error("Error connecting to SignalR:", error);
      setIsAiGenerating(false);
      setModalType("input");
    }
  };

  const disconnect = async () => {
    if (!connection) return;

    try {
      connection.off("ReceiveMessage", receiveMessageHandler);
      await connection.stop();
      console.log("SignalR Connection Stopped.");
    } catch (error) {
      console.error("Error stopping SignalR connection:", error);
    } finally {
      setConnection(null);
    }
  };

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

  return {
    aiGeneratedMessage,
    sendMessage,
    connect,
    disconnect,
    resetState,
  };
}
