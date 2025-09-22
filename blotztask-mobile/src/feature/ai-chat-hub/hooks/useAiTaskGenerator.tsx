// useAiTaskGenerator.ts (no useCallback)
import { useRef, useState } from "react";
import * as signalR from "@microsoft/signalr";
import { ConversationMessage } from "@/feature/ai-chat-hub/models/conversation-message";
import { mapExtractedTaskDTOToAiTaskDTO } from "@/feature/ai-chat-hub/util/map-extracted-to-task-dto";
import { AiTaskDTO } from "../models/ai-task-dto";
import { ExtractedTaskDTO } from "../models/extracted-task-dto";
import { signalRService } from "../services/ai-task-generator-signalr-service";
import { ModalType } from "@/feature/ai-task-generate/modals/modal-type";

export function useAiTaskGenerator() {
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<AiTaskDTO[]>([]);
  const [modalType, setModalType] = useState<ModalType>("input");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const connectionRef = useRef<signalR.HubConnection | null>(null);
  const listenersBoundRef = useRef(false);

  const handlerRefs = useRef<{
    receiveMessage?: (msg: ConversationMessage) => void;
    receiveTasks?: (tasks: ExtractedTaskDTO[]) => void;
    botTyping?: (typing: boolean) => void;
  }>({});

  function receiveMessageHandler(msg: ConversationMessage) {
    if (msg.isBot === false) return;
    setMessages((prev = []) => [...prev, msg]);
    setModalType("task-preview");
  }

  function receiveTasksHandler(receivedTasks: ExtractedTaskDTO[]) {
    if (!receivedTasks || receivedTasks.length === 0) return;
    const mapped = receivedTasks.map(mapExtractedTaskDTOToAiTaskDTO);
    setAiGeneratedTasks(mapped);
    setMessages((prev = []) => [
      ...prev,
      {
        content: "Here are the tasks I generated for you :)",
        isBot: true,
        tasks: mapped,
      },
    ]);
  }

  function botTypingHandler(typing: boolean) {
    setIsTyping(typing);
  }

  function bindListeners(conn: signalR.HubConnection) {
    if (listenersBoundRef.current) return;

    handlerRefs.current.receiveMessage = receiveMessageHandler;
    handlerRefs.current.receiveTasks = receiveTasksHandler;
    handlerRefs.current.botTyping = botTypingHandler;

    conn.on("ReceiveMessage", handlerRefs.current.receiveMessage!);
    conn.on("ReceiveTasks", handlerRefs.current.receiveTasks!);
    conn.on("BotTyping", handlerRefs.current.botTyping!);
    conn.onclose(() => setIsTyping(false));

    listenersBoundRef.current = true;
  }

  function unbindListeners(conn: signalR.HubConnection) {
    if (!listenersBoundRef.current) return;

    if (handlerRefs.current.receiveMessage) {
      conn.off("ReceiveMessage", handlerRefs.current.receiveMessage);
    }
    if (handlerRefs.current.receiveTasks) {
      conn.off("ReceiveTasks", handlerRefs.current.receiveTasks);
    }
    if (handlerRefs.current.botTyping) {
      conn.off("BotTyping", handlerRefs.current.botTyping);
    }
    listenersBoundRef.current = false;
    handlerRefs.current = {};
  }

  async function connect() {
    if (isConnected && connectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    if (!connectionRef.current) {
      connectionRef.current = signalRService.createConnection();
    }
    const conn = connectionRef.current;

    try {
      bindListeners(conn);
      await conn.start();
      setIsConnected(true);
      console.log("Connected to SignalR hub!");
    } catch (error) {
      console.error("Error connecting to SignalR:", error);
      setIsConnected(false);
    }
  }

  async function disconnect() {
    const conn = connectionRef.current;
    if (!conn) return;

    try {
      unbindListeners(conn);
      await conn.stop();
      console.log("SignalR Connection Stopped.");
    } catch (error) {
      console.error("Error stopping SignalR connection:", error);
    } finally {
      setIsConnected(false);
      connectionRef.current = null;
      setModalType("input");
      setAiGeneratedTasks([]);
      setMessages([]);
    }
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;
    const conn = connectionRef.current;

    const userMessage: ConversationMessage = { content: text.trim(), isBot: false };
    setMessages((prev = []) => [...prev, userMessage]);
    setModalType("loading");

    if (conn && conn.state === signalR.HubConnectionState.Connected) {
      try {
        await signalRService.invoke(conn, "SendMessage", "User", text.trim());
      } catch (error) {
        console.error("Error invoking SendMessage:", error);
        setModalType(aiGeneratedTasks.length > 0 ? "task-preview" : "input");
      }
    } else {
      console.warn("Cannot send message: Not connected.");
      setModalType(aiGeneratedTasks.length > 0 ? "task-preview" : "input");
    }
  }

  return {
    aiGeneratedTasks,
    messages,
    modalType,
    isTyping,
    isConnected,
    setModalType,
    connect,
    disconnect,
    sendMessage,
  };
}
