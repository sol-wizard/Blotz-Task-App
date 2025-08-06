import { useEffect, useState, useCallback } from "react";
import uuid from "react-native-uuid";
import * as signalR from "@microsoft/signalr";
import { ConversationMessage } from "@/feature/ai/models/conversation-message";
import { ExtractedTask } from "@/feature/ai/models/extracted-task.dto";
import { mapExtractedToTaskDetail } from "@/feature/ai/services/map-extracted-to-task-dto";
import { signalRService } from "@/services/signalr-service";
import { TaskDetailDTO } from "@/models/task-detail-dto";

export function useSignalRChat(userName: string, conversationId: string) {
  const initialMessages: ConversationMessage[] = [
    {
      content: "Hello! How can I assist you today?",
      conversationId,
      isBot: true,
      sender: "Bot",
      timestamp: new Date().toISOString(),
    },
  ];

  const [messages, setMessages] =
    useState<ConversationMessage[]>(initialMessages);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim()) return;

      const userMessage: ConversationMessage = {
        content: text.trim(),
        conversationId: uuid.v4().toString(),
        isBot: false,
        sender: userName,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);

      if (connection) {
        try {
          await signalRService.invoke(
            connection,
            "SendMessage",
            userName,
            text.trim(),
            conversationId
          );
        } catch (error) {
          console.error("Error invoking SendMessage:", error);
        }
      } else {
        console.warn("Cannot send message: Not connected.");
      }
    },
    [connection, conversationId, userName]
  );

  const receiveMessageHandler = useCallback(
    (msg: ConversationMessage) => {
      if (msg.sender === userName) return;
      setMessages((prev) => [...prev, msg]);
    },
    [userName]
  );

  const receiveTasksHandler = useCallback((receivedTasks: ExtractedTask[]) => {
    if (!receivedTasks || receivedTasks.length === 0) return;

    const mappedTasks: TaskDetailDTO[] = receivedTasks.map(
      mapExtractedToTaskDetail
    );

    setMessages((prev) => [
      ...prev,
      {
        content: "Here are the tasks I generated for you :)",
        conversationId: uuid.v4().toString(),
        isBot: true,
        sender: "Bot",
        timestamp: new Date().toISOString(),
        tasks: mappedTasks,
      },
    ]);
  }, []);

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
  }, [receiveMessageHandler, receiveTasksHandler]);

  return { messages, sendMessage };
}
