'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';
import * as signalR from '@microsoft/signalr';

interface Message {
  id: string;
  sender: string;
  content: string;
  timestamp: Date;
  isBot: boolean;
}

// Mock responses when backend is unavailable
const mockResponses = [
  "I'm unable to connect to the backend service right now. This is an offline response.",
  "The chat service appears to be offline. Here's a simulated response.",
  "Backend connection failed. This is a fallback response from the frontend.",
  "I'm operating in offline mode. The chat server is currently unavailable.",
  "This is a simulated response because the backend service is not responding."
];

const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ChatPage() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversationId, setConversationId] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [isConnecting, setIsConnecting] = useState(true);
  const [connectionError, setConnectionError] = useState<boolean>(false);
  const [connectionRetries, setConnectionRetries] = useState<number>(0);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const userName = session?.user?.name || 'User';
  const maxRetries = 3;
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  // Initialize with a default conversation ID
  useEffect(() => {
    if (!conversationId) {
      const newConvoId = uuidv4();
      setConversationId(newConvoId);
    }
  }, [conversationId]);

  // Function to get a random mock response
  const getMockResponse = useCallback(() => {
    const randomIndex = Math.floor(Math.random() * mockResponses.length);
    return mockResponses[randomIndex];
  }, []);

  // Handle offline message
  const handleOfflineMessage = useCallback((userMessage: string) => {
    const botResponse = {
      id: uuidv4(),
      sender: 'ChatBot',
      content: getMockResponse(),
      timestamp: new Date(Date.now() + 1000),
      isBot: true
    };
    
    setTimeout(() => {
      setMessages(prev => [...prev, botResponse]);
    }, 1000);
  }, [getMockResponse]);

  // Connect to SignalR hub
  const connect = useCallback(async () => {
    if (isOfflineMode) return;
    
    // Check if we already have an active connection
    if (connectionRef.current && connectionRef.current.state === signalR.HubConnectionState.Connected) {
      console.log('Using existing active SignalR connection');
      return;
    }
    
    // Clean up any existing connection before creating a new one
    if (connectionRef.current) {
      console.log('Stopping existing connection before creating a new one');
      await connectionRef.current.stop();
      connectionRef.current = null;
    }

    try {
      setIsConnecting(true);
      console.log('Creating new SignalR connection');
      
      const newConnection = new signalR.HubConnectionBuilder()
        .withUrl(`${apiUrl}/chatHub`, {
          skipNegotiation: false,
          transport: signalR.HttpTransportType.WebSockets
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 15000])
        .configureLogging(signalR.LogLevel.Warning)
        .build();

      // Only register the event handler once
      newConnection.off('ReceiveMessage');
      newConnection.on('ReceiveMessage', (user, message, convoId) => {
        if (convoId === conversationId) {
          console.log('Received message from server:', { user, message, convoId });
          const newMsg = {
            id: uuidv4(),
            sender: user,
            content: message,
            timestamp: new Date(),
            isBot: user === 'ChatBot'
          };
          
          setMessages(prev => [...prev, newMsg]);
        }
      });

      newConnection.onclose((error) => {
        console.log('SignalR connection closed', error);
        if (error) {
          setConnectionError(true);
          if (connectionRetries >= maxRetries) {
            setIsOfflineMode(true);
          }
        }
        connectionRef.current = null;
      });

      await newConnection.start();
      console.log('Connected to SignalR Hub');
      connectionRef.current = newConnection;
      setConnectionError(false);
      setIsConnecting(false);
      setConnectionRetries(0);
    } catch (error) {
      console.error('Error connecting to SignalR Hub:', error);
      connectionRef.current = null;
      setConnectionRetries(prevRetries => prevRetries + 1);
      
      if (connectionRetries >= maxRetries) {
        console.log(`Failed to connect after ${maxRetries} attempts, switching to offline mode`);
        setIsOfflineMode(true);
        setConnectionError(true);
      } else {
        setTimeout(connect, 5000);
      }
      setIsConnecting(false);
    }
  }, [conversationId, apiUrl, connectionRetries, isOfflineMode, maxRetries]);

  useEffect(() => {
    if (conversationId && !isOfflineMode && !connectionRef.current) {
      connect();
    }

    return () => {
      if (connectionRef.current) {
        console.log('Stopping SignalR connection on cleanup');
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, [conversationId, connect, isOfflineMode]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleReconnect = () => {
    setIsConnecting(true);
    setConnectionError(false);
    setIsOfflineMode(false);
    setConnectionRetries(0);
    
    if (connectionRef.current) {
      connectionRef.current.stop().then(() => {
        connect();
      });
    } else {
      connect();
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !conversationId) return;
    
    const messageToSend = newMessage;
    setNewMessage(''); // Clear input field immediately to prevent double sending
    
    try {
      console.log('Sending message:', messageToSend);
      
      if (isOfflineMode) {
        // For offline mode, we need to add messages locally
        const userMessage = {
          id: uuidv4(),
          sender: userName,
          content: messageToSend,
          timestamp: new Date(),
          isBot: false
        };
        
        setMessages(prev => [...prev, userMessage]);
        handleOfflineMessage(messageToSend);
      } else {
        if (connectionRef.current) {
          // The server will broadcast this message back to all clients including sender
          await connectionRef.current.invoke('SendMessage', userName, messageToSend, conversationId);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setIsOfflineMode(true);
      setConnectionError(true);
      
      // Add the message locally since we're now in offline mode
      const userMessage = {
        id: uuidv4(),
        sender: userName,
        content: messageToSend,
        timestamp: new Date(),
        isBot: false
      };
      
      setMessages(prev => [...prev, userMessage]);
      handleOfflineMessage(messageToSend);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Simple Chat</h1>
        
        {/* Connection status indicator */}
        {connectionError && (
          <button 
            onClick={handleReconnect}
            className="text-red-500 hover:text-red-700 flex items-center text-sm"
          >
            {isOfflineMode ? "Offline Mode" : "Connection Error"} 
            <span className="ml-1">⟳</span>
          </button>
        )}
      </div>
      
      <div className="h-[calc(100vh-120px)] border rounded flex flex-col">
        {/* Chat header */}
        <div className="border-b px-4 py-2">
          <div className="font-medium">Chat</div>
          {isOfflineMode && (
            <div className="text-xs text-amber-500">Offline mode</div>
          )}
        </div>
        
        {/* Messages */}
        <div className="flex-1 overflow-auto p-4">
          {messages.length === 0 && !isConnecting ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              No messages yet. Start by sending a message.
            </div>
          ) : isConnecting ? (
            <div className="h-full flex items-center justify-center text-gray-500 text-sm">
              Connecting to chat service...
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-lg p-3 ${
                    msg.isBot
                      ? 'bg-gray-100' 
                      : 'bg-blue-100'
                  }`}>
                    <div className="text-xs mb-1 flex justify-between">
                      <span>{msg.isBot ? 'Bot' : userName}</span>
                      <span className="text-gray-500 ml-4">{msg.timestamp.toLocaleTimeString()}</span>
                    </div>
                    <div className="whitespace-pre-wrap break-words">
                      {msg.content}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
        
        {/* Message input */}
        <div className="border-t p-2">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isConnecting}
              placeholder="Type your message..."
              className="flex-1 border rounded p-2"
            />
            <button 
              type="submit" 
              disabled={isConnecting || !newMessage.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}