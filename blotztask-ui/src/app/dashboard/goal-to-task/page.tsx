'use client';

import MessageInput from "./components/message-input";
import { useEffect, useState } from "react";
import { ExtractedTask } from "@/model/extracted-task-dto";
import { useSession } from "next-auth/react";
import { signalRService } from "@/services/signalr-service";
import { v4 as uuidv4 } from 'uuid';
import { HubConnectionState } from "@microsoft/signalr";
import { ChatPanel } from "./components/chat-panel";
import { setupChatHandlers } from "./utils/setup-chat-handler";
import { ChatPanelHeader } from "./components/chat-panel-header";
import { ConversationMessage } from "./models/chat-message";
import { SidePanel } from "./components/chat-sidepanel";
import { SidebarProvider } from "./components/ui/sidepanel";

export default function ChatPage() {
  const { data: session } = useSession();

  const [conversationId] = useState<string>(() => {
    console.log('[SignalR] Create Conversation ID...');
    return uuidv4();
  });

  const [connection, setConnection] = useState<signalR.HubConnection | null>(null);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(HubConnectionState.Disconnected); // Track connection state
  const [isConversationComplete, setIsConversationComplete] = useState<boolean>(false);

  //TODO: we can give user a better user message based on why it failed maybe a dialog(e.g. "Run out of token or something else")
  // const [connectionError, setConnectionError] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  //TODO : If we use react hook form here, we dont need to use this state here anymore
  const [userMessageInput, setUserMessageInput] = useState<string>('');
  const [isBotTyping, setIsBotTyping] = useState<boolean>(false);

  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());
  //TODO: I dont think we store user info in the frontend session, but we can implement that later (we currently use api to get user info)
  const userName = session?.user?.name || 'User';

  useEffect(() => {
    const connect = signalRService.createConnection();
    setConnection(connect);
    connect
      .start()
      .then(() => {
        setupChatHandlers(
          connect,
          setMessages,
          setTasks,
          setIsConversationComplete,
          setConnectionState,
          setIsBotTyping
        );
      })
      .catch((err) => {
        console.error('[SignalR] Error starting connection:', err);
        // setConnectionError("Failed to connect to chat service. Please try again.");
      });

    return () => {
      connection
      .stop()
        .then(() => console.log('[SignalR] Connection stopped'));
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessageInput.trim() || isConversationComplete) return;

    const messageToSend = userMessageInput;
    //TODO: If we use the react hook form here, we can easily reset the
    setUserMessageInput('');

    try {
      await signalRService.invoke(connection, 'SendMessage', userName, messageToSend, conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleTaskAdded = (index) => {
    setAddedTaskIndices((prev) => new Set(prev).add(index));
  };

  const handleReconnect = async () => {
    if (connection) {
      // setConnectionError(null);
      setConnectionState(HubConnectionState.Connecting);
  
      try {
        await connection.start();
        setupChatHandlers(
          connection,
          setMessages,
          setTasks,
          setIsConversationComplete,
          setConnectionState,
          setIsBotTyping
        );
      } catch (err) {
        console.error("Reconnect failed", err);
        // setConnectionError("Failed to reconnect. Please try again.");
        setConnectionState(HubConnectionState.Disconnected);
      }
    }
  };

 return (
  <div className="mx-auto h-[75vh] p-4 flex ">
    <SidebarProvider>
    <div className="flex flex-col h-full w-full">
      <ChatPanelHeader
        connectionState={connectionState}
        isReconnecting={connectionState === HubConnectionState.Connecting}
        onReconnect={handleReconnect}
      />

      {/* Chat section */}
      <div className="flex flex-col h-full">
        <ChatPanel
          messages={messages}
          userName={userName}
          connectionState={connectionState}
          isConversationComplete={isConversationComplete}
          isBotTyping={isBotTyping}
        />

        <MessageInput
          userMessageInput={userMessageInput}
          setUserMessageInput={setUserMessageInput}
          handleSendMessage={handleSendMessage}
          isConnecting={connectionState === HubConnectionState.Connecting}
          isConversationComplete={isConversationComplete}
        />
      </div>
    </div>

    <SidePanel
        tasks={tasks}
        addedTaskIndices={addedTaskIndices}
        onTaskAdded={handleTaskAdded}
      />
    </SidebarProvider>
  </div>
)}