import { useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useSession } from 'next-auth/react';
import { useSignalR } from '@/hooks/use-signalR';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { SIGNALR_HUBS_CHAT } from '@/services/signalr-service';
import { ConversationMessage } from './models/chat-message';
import { Message } from './models/message';
import { mockResponses } from './constants/mock-response';

export function useChatConversation() {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [tasks, setTasks] = useState<ExtractedTask[]>([]);
  const [addedTaskIndices, setAddedTaskIndices] = useState<Set<number>>(new Set());
  const [conversationId, setConversationId] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [connectionRetries, setConnectionRetries] = useState<number>(0);
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [showTasks, setShowTasks] = useState<boolean>(false);
  const [isConversationComplete, setIsConversationComplete] = useState<boolean>(false);
  const userName = session?.user?.name || 'User';
  const maxRetries = 3;

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
      on('ReceiveMessage', (msg: ConversationMessage) => {
        if (msg.conversationId === conversationId) {
          const newMsg: Message = {
            id: uuidv4(),
            sender: msg.sender,
            content: msg.content,
            timestamp: new Date(msg.timestamp),
            isBot: msg.isBot,
          };
          setMessages((prev) => [...prev, newMsg]);
        }
      });
      on('ReceiveTasks', (receivedTasks: ExtractedTask[]) => {
        if (receivedTasks?.length > 0) {
          setTasks(receivedTasks);
          setShowTasks(true);
          setIsConversationComplete(true);
        }
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
      start().catch(() => {
        setConnectionRetries((prev) => prev + 1);
        if (connectionRetries >= maxRetries) {
          setIsOfflineMode(true);
        }
      });
    }
  }, [conversationId, start, connectionRetries, maxRetries, isOfflineMode]);

  const handleReconnect = async () => {
    if (isOfflineMode) {
      setIsOfflineMode(false);
      setConnectionRetries(0);
    }
    try {
      await stop();
      await start();
    } catch (error) {
      // Optionally handle reconnection error
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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
    setShowTasks(false);
    setIsConversationComplete(false);
    setAddedTaskIndices(new Set());
  };

  const handleTaskAdded = (index: number) => {
    setAddedTaskIndices((prev) => new Set(prev).add(index));
  };

  return {
    messages,
    setMessages,
    tasks,
    setTasks,
    addedTaskIndices,
    setAddedTaskIndices,
    conversationId,
    setConversationId,
    newMessage,
    setNewMessage,
    connectionRetries,
    setConnectionRetries,
    isOfflineMode,
    setIsOfflineMode,
    showTasks,
    setShowTasks,
    isConversationComplete,
    setIsConversationComplete,
    userName,
    isConnecting,
    connectionError,
    handleReconnect,
    handleSendMessage,
    startNewConversation,
    handleTaskAdded,
  };
} 