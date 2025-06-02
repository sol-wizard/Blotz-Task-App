'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';
import { useSignalR } from '@/app/dashboard/goal-to-task/hooks/use-signalR';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { SIGNALR_HUBS_CHAT } from '@/services/signalr-service';
import { ConversationMessage } from './models/chat-message';
import { Message } from './models/message';
import { mockResponses, mockTasks } from './constants/mock-response';
import { Button } from '@/components/ui/button';
import { GeneratedTasksPanel } from './components/generated-tasks-panel';

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);

  //TODO: Remove mock tasks after ui fix and use the backend response
  const [tasks, setTasks] = useState<ExtractedTask[]>(mockTasks);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());
  const [conversationId, setConversationId] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [connectionRetries, setConnectionRetries] = useState<number>(0);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [showTasks, setShowTasks] = useState<boolean>(false);
  const [isConversationComplete, setIsConversationComplete] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userName = session?.user?.name || 'User';

  const handleTaskAdded = (index) => {
    setAddedTaskIndices((prev) => new Set(prev).add(index));
  };

  // Initialize with a default conversation ID
  useEffect(() => {
    if (!conversationId) {
      const newConvoId = uuidv4();
      setConversationId(newConvoId);
    }
  }, [conversationId]);

  // Use the SignalR hook
  const { connection, connectionState, invoke, on, start, stop, error } = useSignalR(SIGNALR_HUBS_CHAT);

  // Interpret the connection state for UI purposes
  const isConnecting = connectionState === 'connecting' || connectionState === 'reconnecting';
  const connectionError = !!error || isOfflineMode;

  // Function to get a random mock response
  const getMockResponse = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * mockResponses.length);
    return mockResponses[randomIndex];
  }, []);

  // Handle offline message
  const handleOfflineMessage = useCallback(() => {
    const botResponse = {
      id: uuidv4(),
      sender: 'ChatBot',
      content: getMockResponse(),
      timestamp: new Date(Date.now() + 1000),
      isBot: true,
    };

    setTimeout(() => {
      setMessages((prev) => [...prev, botResponse]);
    }, 1000);
  }, [getMockResponse]);

  // Set up message and task receiving
  useEffect(() => {
    if (connection) {
      // ✅ Type-safe message handler
      on('ReceiveMessage', (msg: ConversationMessage) => {
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
      on('ReceiveTasks', (receivedTasks: ExtractedTask[]) => {
        if (receivedTasks?.length > 0) {
          setTasks(receivedTasks);
          setIsConversationComplete(true);
        }
        console.log(receivedTasks);
      });
  
      on('ConversationCompleted', (convoId: string) => {
        if (convoId === conversationId) {
          setIsConversationComplete(true);
        }
      });
    }
  }, [connection, conversationId, on]);
  
  // Connect to hub
  useEffect(() => {
    if (!isOfflineMode && conversationId) {
      start().catch((err) => {
        console.error('Error starting connection:', err);
        setConnectionRetries((prev) => prev + 1);
      });
    }
  }, [conversationId, start, connectionRetries, isOfflineMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReconnect = async () => {
    if (isOfflineMode) {
      setIsOfflineMode(false);
      setConnectionRetries(0);
    }

    try {
      await stop();
      await start();
    } catch (error) {
      console.error('Reconnection failed:', error);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId || isConversationComplete) return;

    const messageToSend = newMessage;
    setNewMessage('');

    try {
      if (isOfflineMode) {
        const userMessage = {
          id: uuidv4(),
          sender: userName,
          content: messageToSend,
          timestamp: new Date(),
          isBot: false,
        };
        setMessages((prev) => [...prev, userMessage]);
        handleOfflineMessage();
      } else {
        await invoke('SendMessage', userName, messageToSend, conversationId);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsOfflineMode(true);

      const userMessage = {
        id: uuidv4(),
        sender: userName,
        content: messageToSend,
        timestamp: new Date(),
        isBot: false,
      };
      setMessages((prev) => [...prev, userMessage]);
      handleOfflineMessage();
    }
  };

  const startNewConversation = () => {
    const newConvoId = uuidv4();
    setConversationId(newConvoId);
    setMessages([]);
    setTasks([]);
    setIsConversationComplete(false);
    setAddedTaskIndices(new Set());
  };

  return (
    <div className="mx-auto h-[75vh] p-4 flex ">
      <div className="flex flex-col h-full w-full">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold">Goal Planning Chat</h1>
          
          <div className="flex items-center gap-2">
            {connectionError && (
              <button
                onClick={handleReconnect}
                className="text-red-500 hover:text-red-700 flex items-center text-sm"
              >
                {isOfflineMode ? 'Offline Mode' : 'Connection Error'}
                <span className="ml-1">⟳</span>
              </button>
            )}

            <Button variant="outline" onClick={() => setShowTasks((prev) => !prev)}>show & hide</Button>
          </div>
        </div>

        {/* Chat section */}
        <div className="flex flex-col h-full">
          {/* Chat header */}
          <div className="px-4 py-2 flex justify-between items-center">
            {isConversationComplete && (
              <button onClick={startNewConversation} className="text-sm bg-blue-100 px-2 py-1 rounded">
                New Conversation
              </button>
            )}
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
          <div className="p-2">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                disabled={isConnecting || isConversationComplete}
                placeholder={isConversationComplete ? 'Conversation completed' : 'Type your message...'}
                className="flex-1 border rounded p-2 disabled:bg-gray-100"
              />
              <button
                type="submit"
                disabled={isConnecting || !newMessage.trim() || isConversationComplete}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
              >
                Send
              </button>
            </form>
          </div>
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
  );
}
