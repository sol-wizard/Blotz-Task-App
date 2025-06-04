'use client';

import { Button } from "@/components/ui/button";
import { GeneratedTasksPanel } from "./components/generated-tasks-panel";
import MessageInput from "./components/message-input";
import { useEffect, useRef, useState } from "react";
import { ExtractedTask } from "@/model/extracted-task-dto";
import { mockTasks } from "./constants/mock-response";
import { Message } from "./models/message";
import { useSession } from "next-auth/react";
import { signalRService } from "@/services/signalr-service";
import { ConversationMessage } from "./models/chat-message";
import { v4 as uuidv4 } from 'uuid';


export default function ChatPage() {
  const { data: session } = useSession();

  const [tasks, setTasks] = useState<ExtractedTask[]>(mockTasks);
  const [showTasks, setShowTasks] = useState<boolean>(false);

  const [isConversationComplete, setIsConversationComplete] = useState<boolean>(false);

  const [conversationId] = useState<string>(() => {
    console.log('[SignalR] Create Conversation ID...');
    return uuidv4();
  });
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [connectionState, setConnectionState] = useState('disconnected'); // Track connection state
  const [userMessageInput, setUserMessageInput] = useState<string>('');
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());


  //TODO: I dont think we store user info in the frontend session, but we can implement that later (we currently use api to get user info)
  const userName = session?.user?.name || 'User';

  const isConnecting = connectionState === 'connecting';

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const connect = signalRService.createConnection();
    // setConnection(connect);
    connect
      .start()
      .then(() => {
        console.log('[SignalR] Connection started')
        setConnectionState('connected');
        connect.on('ReceiveMessage', (msg: ConversationMessage) => {
          console.log('[SignalR] Received message:', msg);
          if (msg.conversationId === conversationId) {
            const newMsg: Message = {
              id: uuidv4(),
              sender: msg.sender,
              content: msg.content,
              timestamp: new Date(msg.timestamp), // if timestamp is a string
              isBot: msg.isBot,
            };
            setMessages((prev) => [...prev, newMsg]);
          }
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

  //Use to scroll to the bottom of the messages, every time the messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessageInput.trim() || isConversationComplete) return;

    const messageToSend = userMessageInput;
    setUserMessageInput('');

    try {
      // if (isOfflineMode) {
      //   const userMessage = {
      //     id: uuidv4(),
      //     sender: userName,
      //     content: messageToSend,
      //     timestamp: new Date(),
      //     isBot: false,
      //   };
      //   setMessages((prev) => [...prev, userMessage]);
      //   handleOfflineMessage();
      // } else {
        await signalRService.invoke('SendMessage', userName, messageToSend, conversationId);
      // }
    } catch (error) {
      console.error('Error sending message:', error);
      // setIsOfflineMode(true);

      // const userMessage = {
      //   id: uuidv4(),
      //   sender: userName,
      //   content: messageToSend,
      //   timestamp: new Date(),
      //   isBot: false,
      // };
      // setMessages((prev) => [...prev, userMessage]);
      // handleOfflineMessage();
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
          {/* {connectionError && (
            <button
              // onClick={handleReconnect}
              className="text-red-500 hover:text-red-700 flex items-center text-sm"
            >
              {isOfflineMode ? 'Offline Mode' : 'Connection Error'}
              <span className="ml-1">⟳</span>
            </button>
          )} */}

          <Button variant="outline" onClick={() => setShowTasks((prev) => !prev)}>show & hide</Button>
        </div>
      </div>

      {/* Chat section */}
      <div className="flex flex-col h-full">
        {/* Chat header */}
        <div className="px-4 py-2 flex justify-between items-center">
          {/* {isConversationComplete && (
            <button 
              // onClick={startNewConversation}
              className="text-sm bg-blue-100 px-2 py-1 rounded">
              New Conversation
            </button>
          )} */}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4">
          {messages.length === 0 && !isConnecting ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              {isConversationComplete
                ? 'This conversation is complete. Start a new one to continue.'
                : 'Describe your goal to get started. The assistant will help break it down into tasks.'}
            </div>
          ) : isConnecting ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Connecting to chat service...
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div
                    className={`max-w-[80%] rounded-lg p-3 ${msg.isBot ? 'bg-gray-100' : 'bg-blue-100'}`}
                  >
                    <div className="text-xs mb-1 flex justify-between">
                      <span>{msg.isBot ? 'Assistant' : userName}</span>
                      <span className="text-gray-500 ml-4">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Message input */}
        <MessageInput
          userMessageInput={userMessageInput}
          setUserMessageInput={setUserMessageInput}
          handleSendMessage={handleSendMessage}
          isConnecting={isConnecting}
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