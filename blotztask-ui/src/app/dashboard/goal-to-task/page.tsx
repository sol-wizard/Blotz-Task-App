'use client';

import { Button } from "@/components/ui/button";
import { GeneratedTasksPanel } from "./components/generated-tasks-panel";
import MessageInput from "./components/message-input";
import { useEffect, useState } from "react";
import { ExtractedTask } from "@/model/extracted-task-dto";
import { mockTasks } from "./constants/mock-response";
import { useSession } from "next-auth/react";
import { signalRService } from "@/services/signalr-service";
import { ConversationMessage } from "./models/chat-message";
import { v4 as uuidv4 } from 'uuid';
import { HubConnectionState } from "@microsoft/signalr";
import { ChatPanel } from "./components/chat-panel";


export default function ChatPage() {
  const { data: session } = useSession();

  const [tasks, setTasks] = useState<ExtractedTask[]>(mockTasks);
  const [showTasks, setShowTasks] = useState<boolean>(false);

  const [isConversationComplete, setIsConversationComplete] = useState<boolean>(false);

  const [conversationId] = useState<string>(() => {
    console.log('[SignalR] Create Conversation ID...');
    return uuidv4();
  });
  
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [connectionState, setConnectionState] = useState<HubConnectionState>(HubConnectionState.Disconnected); // Track connection state
  const [userMessageInput, setUserMessageInput] = useState<string>('');
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());

  //TODO: I dont think we store user info in the frontend session, but we can implement that later (we currently use api to get user info)
  const userName = session?.user?.name || 'User';

  useEffect(() => {
    const connect = signalRService.createConnection();
    // setConnection(connect);
    connect
      .start()
      .then(() => {
        console.log('[SignalR] Connection started')
        setConnectionState(HubConnectionState.Connected);
        connect.on('ReceiveMessage', (msg: ConversationMessage) => {

          console.log('[SignalR] Received message:', msg);
            const newMsg: ConversationMessage = {
              conversationId: msg.conversationId,
              sender: msg.sender,
              content: msg.content,
              timestamp: new Date(msg.timestamp),
              isBot: msg.isBot,
            };
            setMessages((prev) => [...prev, newMsg]);
        });
  
        // 👇 These stay the same unless you also type `ExtractedTask`
        connect.on('ReceiveTasks', (receivedTasks: ExtractedTask[]) => {
          console.log('[SignalR] Received tasks:', receivedTasks);
          if (receivedTasks?.length > 0) {
            setTasks(receivedTasks);
            setIsConversationComplete(true);
          }
        });
  
        connect.on('ConversationCompleted', (convoId: string) => {
          console.log('[SignalR] Conversation completed for:', convoId);
          setIsConversationComplete(true);
        });
      })
      .catch((err) => {
        console.error('[SignalR] Error starting connection:', err);
      });

    return () => {
      connect
      .stop()
        .then(() => console.log('[SignalR] Connection stopped'));
    };
  }, []);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessageInput.trim() || isConversationComplete) return;

    const messageToSend = userMessageInput;
    setUserMessageInput('');

    try {
      await signalRService.invoke('SendMessage', userName, messageToSend, conversationId);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };
  
  const handleTaskAdded = (index) => {
    setAddedTaskIndices((prev) => new Set(prev).add(index));
  };

 return (
  <div className="mx-auto h-[75vh] p-4 flex ">
    <div className="flex flex-col h-full w-full">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Goal Planning Chat</h1>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowTasks((prev) => !prev)}>show & hide</Button>
        </div>
      </div>

      {/* Chat section */}
      <div className="flex flex-col h-full">
        <ChatPanel
          messages={messages}
          userName={userName}
          connectionState={connectionState}
          isConversationComplete={isConversationComplete}
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

    {showTasks && (   
      <GeneratedTasksPanel
        tasks={tasks}
        addedTaskIndices={addedTaskIndices}
        onTaskAdded={handleTaskAdded}
      />
    )} 
  </div>
 )
}