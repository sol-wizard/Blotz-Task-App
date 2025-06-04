import { HubConnection, HubConnectionState } from "@microsoft/signalr";
import { Dispatch, SetStateAction } from "react";
import { ExtractedTask } from "@/model/extracted-task-dto";
import { ChatRenderMessage } from "../models/chat-message";

export function setupChatHandlers(
  connection: HubConnection,
  setMessages: Dispatch<SetStateAction<ChatRenderMessage[]>>,
  setTasks: Dispatch<SetStateAction<ExtractedTask[]>>,
  setIsConversationComplete: Dispatch<SetStateAction<boolean>>,
  setConnectionState: Dispatch<SetStateAction<HubConnectionState>>,
  setShowTasks: Dispatch<SetStateAction<boolean>>
) {
  console.log("[SignalR] Connection started");
  setConnectionState(HubConnectionState.Connected);

  connection.on("ReceiveMessage", (msg: ChatRenderMessage) => {
    console.log("[SignalR] Received message:", msg);

    if (msg.isBot) {
      setMessages((prev) =>
        prev.filter((m) => !m.isBotTypingPlaceholder)
      );
    }

    const newMsg: ChatRenderMessage = {
      conversationId: msg.conversationId,
      sender: msg.sender,
      content: msg.content,
      timestamp: new Date(msg.timestamp),
      isBot: msg.isBot,
    };
    setMessages((prev) => [...prev, newMsg]);
  });

  connection.on("ReceiveTasks", (receivedTasks: ExtractedTask[]) => {
    console.log("[SignalR] Received tasks:", receivedTasks);
    if (receivedTasks?.length > 0) {
      setTasks(receivedTasks);
      setIsConversationComplete(true);
      setShowTasks(true);
    }
  });

  connection.on("ConversationCompleted", (convoId: string) => {
    console.log("[SignalR] Conversation completed for:", convoId);
    setIsConversationComplete(true);
  });

  connection.on("BotTyping", (convoId: string) => {
    const typingMsg: ChatRenderMessage = {
      conversationId: convoId,
      sender: "Assistant",
      content: "Typing...",
      timestamp: new Date(),
      isBot: true,
      isBotTypingPlaceholder: true,
    };
    setMessages((prev) => [...prev, typingMsg]);
  });
}
