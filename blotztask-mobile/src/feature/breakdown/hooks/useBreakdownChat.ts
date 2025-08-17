import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { AiTaskDTO } from "../../ai/models/ai-task-dto";
import { mapExtractedTaskDTOToAiTaskDTO } from "../../ai/services/map-extracted-to-task-dto";
import { ConversationMessage } from "../../ai/models/conversation-message";
import { ExtractedTaskDTO } from "../../ai/models/extracted-task-dto";

const API_BASE_URL = process.env.EXPO_PUBLIC_URL;
const BREAKDOWN_HUB_URL = `${API_BASE_URL}/ai-task-breakdown-chathub`;

export function useBreakdownChat(conversationId: string) {
  const [messages, setMessages] = useState<ConversationMessage[]>();
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ConversationMessage = {
      content: text.trim(),
      isBot: false,
    };

    setMessages((prev = []) => [...prev, userMessage]);

    if (connection) {
      try {
        await connection.invoke(
          "SendMessage",
          "User",
          text.trim(),
          conversationId
        );
      } catch (error) {
        console.error("Error invoking SendMessage:", error);
      }
    } else {
      console.warn("Cannot send message: Not connected.");
    }
  };

  const receiveMessageHandler = (msg: ConversationMessage) => {
    if (msg.isBot === false) return;
    setMessages((prev = []) => [...prev, msg]);
  };

  const receiveTasksHandler = (receivedTasks: ExtractedTaskDTO[]) => {
    if (!receivedTasks || receivedTasks.length === 0) return;
    const mappedTasks: AiTaskDTO[] = receivedTasks.map(
      mapExtractedTaskDTOToAiTaskDTO
    );

    setMessages((prev = []) => [
      ...prev,
      {
        content: "Here are the tasks I generated for you :)",
        isBot: true,
        tasks: mappedTasks,
      },
    ]);
  };

  useEffect(() => {
    const newConnection = new signalR.HubConnectionBuilder()
      .withUrl(BREAKDOWN_HUB_URL)
      .withAutomaticReconnect()
      .build();

    setConnection(newConnection);

    const startConnection = async () => {
      try {
        await newConnection.start();
        newConnection.on("ReceiveMessage", receiveMessageHandler);
        newConnection.on("ReceiveTasks", receiveTasksHandler);
        console.log("Connected to Breakdown SignalR hub!", BREAKDOWN_HUB_URL);
      } catch (error) {
        console.error("Error connecting to Breakdown SignalR:", error);
      }
    };

    startConnection();

    return () => {
      newConnection
        .stop()
        .then(() => {
          console.log("Breakdown SignalR Connection Stopped.");
          newConnection.off("ReceiveMessage", receiveMessageHandler);
          newConnection.off("ReceiveTasks", receiveTasksHandler);
        })
        .catch((error) =>
          console.error("Error stopping Breakdown SignalR connection:", error)
        );
    };
  }, []);

  return { messages, sendMessage };
}


