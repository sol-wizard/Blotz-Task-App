import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { ConversationMessage } from "@/feature/ai-chat-hub/models/conversation-message";
import { mapExtractedTaskDTOToAiTaskDTO } from "@/feature/ai-chat-hub/util/map-extracted-to-task-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { signalRService } from "../services/ai-task-generator-signalr-service";
import { ModalType } from "@/feature/ai-task-generate/modals/modal-type";

// TODO: messages, isTyping is no longer in use
export function useAiTaskGenerator() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<AiTaskDTO[]>([]);
  const [modalType, setModalType] = useState<ModalType>("input");

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMessage: ConversationMessage = {
      content: text.trim(),
      isBot: false,
    };

    setMessages((prev = []) => [...prev, userMessage]);
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

  const receiveMessageHandler = (msg: ConversationMessage) => {
    if (msg.isBot === false) return;
    setMessages((prev = []) => [...prev, msg]);
    setModalType("task-preview");
  };

  const receiveTasksHandler = (receivedTasks: ExtractedTaskDTO[]) => {
    if (!receivedTasks || receivedTasks.length === 0) return;

    const mappedTasks: AiTaskDTO[] = receivedTasks.map(mapExtractedTaskDTOToAiTaskDTO);
    console.log("mappedTasks,", mappedTasks);
    setAiGeneratedTasks(mappedTasks);

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
        .catch((error) => console.error("Error stopping SignalR connection:", error));
    };
  }, []);

  return {
    aiGeneratedTasks,
    messages,
    sendMessage,
    isTyping,
    modalType,
    setModalType,
  };
}
