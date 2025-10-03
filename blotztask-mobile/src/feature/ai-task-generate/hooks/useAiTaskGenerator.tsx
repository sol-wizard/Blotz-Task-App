import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { mapExtractedTaskDTOToAiTaskDTO } from "@/feature/ai-task-generate/utils/map-extracted-to-task-dto";
import { BottomSheetType } from "@/feature/ai-task-generate/modals/bottom-sheet-type";
import { AiTaskDTO } from "../modals/ai-task-dto";
import { signalRService } from "@/feature/ai-task-generate/services/ai-task-generator-signalr-service";
import { ExtractedTaskDTO } from "../modals/extracted-task-dto";

export function useAiTaskGenerator() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<AiTaskDTO[]>([]);
  const [modalType, setModalType] = useState<BottomSheetType>("input");
  const [inputError, setInputError] = useState<boolean>(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setModalType("loading");
    if (connection) {
      try {
        await signalRService.invoke(connection, "SendMessage", "User", text.trim());
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

  const receiveTasksHandler = (receivedTasks: ExtractedTaskDTO[]) => {
    const mappedTasks: AiTaskDTO[] = receivedTasks.map(mapExtractedTaskDTOToAiTaskDTO);
    console.log("mappedTasks,", mappedTasks);

    setAiGeneratedTasks(mappedTasks);
    if (mappedTasks.length === 0) {
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
    aiGeneratedTasks,
    sendMessage,
    modalType,
    setModalType,
  };
}
