import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { ConversationMessage } from "@/feature/ai-chat-hub/models/conversation-message";
import { mapExtractedTaskDTOToAiTaskDTO } from "@/feature/ai-chat-hub/services/map-extracted-to-task-dto";
import { signalRService } from "@/feature/ai-chat-hub/services/chathub-signalr-service";
import { AiTaskDTO } from "../models/ai-task-dto";
import { ExtractedTaskDTO } from "../models/extracted-task-dto";

//TODO: Rename to a specific name
export function useSignalRChat() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [isTyping, setIsTyping] = useState(false);

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
          text.trim()
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
    console.log("receivedTasks:", receivedTasks);
    const mappedTasks: AiTaskDTO[] = receivedTasks.map(
      mapExtractedTaskDTOToAiTaskDTO
    );
    console.log("mappedTasks,", mappedTasks);

    setMessages((prev = []) => [
      ...prev,
      {
        content: "Here are the tasks I generated for you :)", //TODO: delete after new endpoint ready. move to chat backend
        isBot: true,
        tasks: mappedTasks,
      },
    ]);
  };

  const botTypingHandler = (typing: boolean) => {
    setIsTyping(typing);
  };

  useEffect(() => {
    const newConnection = signalRService.createConnection();
    setConnection(newConnection);

    const startConnection = async () => {
      try {
        await newConnection.start();
        newConnection.on("ReceiveMessage", receiveMessageHandler);
        newConnection.on("ReceiveTasks", receiveTasksHandler);
        newConnection.on("BotTyping", botTypingHandler);
        newConnection.onclose(() => setIsTyping(false));
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
          newConnection.off("BotTyping", botTypingHandler);
        })
        .catch((error) =>
          console.error("Error stopping SignalR connection:", error)
        );
    };
  }, []);

  return { messages, sendMessage, isTyping };
}
