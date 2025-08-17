import { useEffect, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { BreakdownMessage } from "../models/breakdown-message";
import { SubTask } from "../models/subtask";
import { TaskDetailsDto } from "../models/task-details-dto";

const API_BASE_URL = process.env.EXPO_PUBLIC_URL;
const BREAKDOWN_HUB_URL = `${API_BASE_URL}/ai-task-breakdown-chathub`;

export function useBreakdownChat(taskDetails: TaskDetailsDto) {
  const [messages, setMessages] = useState<BreakdownMessage[]>([]);
  const [connection, setConnection] = useState<signalR.HubConnection | null>(
    null
  );
  const [isTyping, setIsTyping] = useState(false);
  const [hasInitialBreakdown, setHasInitialBreakdown] = useState(false);

  // Function to send chat messages (modify breakdown)
  const sendMessage = async (userMessage: string) => {
    if (!connection) {
      console.warn("Cannot send message: Not connected.");
      return;
    }

    if (!userMessage.trim()) return;

    const message: BreakdownMessage = {
      content: userMessage.trim(),
      isBot: false,
    };

    setMessages((prev) => [...prev, message]);

    try {
      await connection.invoke("ModifyBreakdown", userMessage.trim());
    } catch (error) {
      console.error("Error invoking ModifyBreakdown:", error);
    }
  };

  // Handler for BotTyping events
  const handleBotTyping = (typing: boolean) => {
    setIsTyping(typing);
  };

  // Handler for receiving subtasks from the backend
  const handleReceiveSubtasks = (subtasks: SubTask[]) => {
    if (!subtasks || subtasks.length === 0) return;

    const botMessage: BreakdownMessage = {
      content: "Here are the subtasks I've broken down for you:",
      isBot: true,
      subtasks: subtasks,
    };

    setMessages((prev) => [...prev, botMessage]);
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
        
        // Register event handlers
        newConnection.on("BotTyping", handleBotTyping);
        newConnection.on("ReceiveSubtasks", handleReceiveSubtasks);
        
        console.log("Connected to Breakdown SignalR hub!", BREAKDOWN_HUB_URL);
        
        // Automatically trigger initial breakdown once connected
        if (!hasInitialBreakdown) {
          try {
            await newConnection.invoke("BreakdownTask", taskDetails);
            setHasInitialBreakdown(true);
          } catch (error) {
            console.error("Error invoking BreakdownTask:", error);
          }
        }
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
          newConnection.off("BotTyping", handleBotTyping);
          newConnection.off("ReceiveSubtasks", handleReceiveSubtasks);
        })
        .catch((error) =>
          console.error("Error stopping Breakdown SignalR connection:", error)
        );
    };
  }, [hasInitialBreakdown, taskDetails]);

  return { 
    messages, 
    isTyping, 
    sendMessage,
    isConnected: connection?.state === signalR.HubConnectionState.Connected 
  };
}


