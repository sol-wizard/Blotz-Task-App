import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { BottomSheetType } from "@/feature/ai-task-generate/models/bottom-sheet-type";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { AiGeneratedTaskWrapperDTO } from "../models/ai-generate-task-wrapper";

export function useAiTaskGenerator() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [aiGeneratedMessage, setAiGeneratedMessage] = useState<AiGeneratedTaskWrapperDTO>();
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [inputError, setInputError] = useState<boolean>(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setModalType("loading");
    if (connection) {
      try {
        console.log("Sending message to SignalR:", text);
        await signalRService.invoke(connection, "SendMessage", "User", text);
      } catch (error) {
        console.error("Error invoking SendMessage:", error);
        setInputError(true);
        setModalType("input");
      }
    } else {
      console.warn("Cannot send message: Not connected.");
      setInputError(true);
      setModalType("input");
    }
  };

  const receiveTasksHandler = (receivedAiMessage: AiGeneratedTaskWrapperDTO) => {
    setAiGeneratedMessage(receivedAiMessage);
    if (!receivedAiMessage.isSuccess) {
      setInputError(true);
      setModalType("input");
    } else {
      setModalType("task-preview");
    }
  };

  useEffect(() => {
    const newConnection = signalRService.createConnection();
    setConnection(newConnection);

    const startConnection = async () => {
      try {
        await newConnection.start();
        newConnection.on("ReceiveTasks", receiveTasksHandler);
        console.log("Connected to SignalR hub!");
      } catch (error) {
        console.error("Error connecting to SignalR:", error);
      }
    };

    startConnection();

    return () => {
      newConnection
        .stop()
        .then(() => {
          console.log("SignalR Connection Stopped.");
          newConnection.off("ReceiveTasks", receiveTasksHandler);
        })
        .catch((error) => console.error("Error stopping SignalR connection:", error));
    };
  }, []);

  return {
    inputError,
    setInputError,
    aiGeneratedMessage,
    sendMessage,
    modalType,
    setModalType,
  };
}
