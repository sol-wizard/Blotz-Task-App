import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { ConversationMessage } from "@/feature/ai/models/conversation-message";
import { ExtractedTask } from "@/feature/ai/models/extracted-task-dto";
import { mapExtractedToTaskDetail } from "@/feature/ai/services/map-extracted-to-task-dto";
import { signalRService } from "@/shared/services/signalr-service";
import { AiTaskDTO } from "../models/ai-task-dto";

export function useSignalRChat(conversationId: string) {
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
        await signalRService.invoke(
          connection,
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

  const receiveTasksHandler = (receivedTasks: ExtractedTask[]) => {
    if (!receivedTasks || receivedTasks.length === 0) return;
    const mappedTasks: AiTaskDTO[] = receivedTasks.map(
      mapExtractedToTaskDetail
    );

    setMessages((prev = []) => [
      ...prev,
      {
        content: "Here are the tasks I generated for you :)", //TODO: delete after new endpoint ready. move to chat backend
        isBot: true,
        tasks: mappedTasks,
      },
    ]);
  };

  useEffect(() => {
    const newConnection = signalRService.createConnection();
    setConnection(newConnection);

    const startConnection = async () => {
      try {
        await newConnection.start();
        newConnection.on("ReceiveMessage", receiveMessageHandler);
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
          newConnection.off("ReceiveMessage", receiveMessageHandler);
          newConnection.off("ReceiveTasks", receiveTasksHandler);
        })
        .catch((error) =>
          console.error("Error stopping SignalR connection:", error)
        );
    };
  }, []);

  return { messages, sendMessage };
}
