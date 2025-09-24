import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { mapExtractedTaskDTOToAiTaskDTO } from "@/feature/ai-chat-hub/util/map-extracted-to-task-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { signalRService } from "../services/ai-task-generator-signalr-service";
import { ModalType } from "@/feature/ai-task-generate/modals/modal-type";

export function useAiTaskGenerator() {
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<AiTaskDTO[]>([]);
  const [modalType, setModalType] = useState<ModalType>("input");

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    setModalType("loading");
    if (connection) {
      try {
        await signalRService.invoke(connection, "SendMessage", "User", text.trim());
      } catch (error) {
        console.error("Error invoking SendMessage:", error);
        setModalType(aiGeneratedTasks.length > 0 ? "task-preview" : "input");
      }
    } else {
      console.warn("Cannot send message: Not connected.");
      setModalType(aiGeneratedTasks.length > 0 ? "task-preview" : "input");
    }
  };

  const receiveTasksHandler = (receivedTasks: ExtractedTaskDTO[]) => {
    if (!receivedTasks || receivedTasks.length === 0) return;

    const mappedTasks: AiTaskDTO[] = receivedTasks.map(mapExtractedTaskDTOToAiTaskDTO);
    console.log("mappedTasks,", mappedTasks);

    setAiGeneratedTasks(mappedTasks);
    setModalType("task-preview");
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
    aiGeneratedTasks,
    sendMessage,
    modalType,
    setModalType,
  };
}
