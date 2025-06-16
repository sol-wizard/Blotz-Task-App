import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { Dispatch, SetStateAction } from 'react';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { ConversationMessage } from '../models/chat-message';
import { MessageWithTasks } from '../models/message-with-tasks';
import { v4 as uuidv4 } from 'uuid';

export function setupChatHandlers(
  connection: HubConnection,
  setMessages: Dispatch<SetStateAction<MessageWithTasks[]>>,
  setTasks: Dispatch<SetStateAction<ExtractedTask[]>>,
  setIsConversationComplete: Dispatch<SetStateAction<boolean>>,
  setConnectionState: Dispatch<SetStateAction<HubConnectionState>>,
  setIsBotTyping: Dispatch<SetStateAction<boolean>>
) {
  console.log('[SignalR] Connection started');
  setConnectionState(HubConnectionState.Connected);

  connection.on('ReceiveMessage', (msg: ConversationMessage) => {
    console.log('[SignalR] Received message:', msg);

    const newMsg: MessageWithTasks = {
      id: `${msg.conversationId}-${uuidv4}`,
      role: msg.isBot ? 'assistant' : 'user',
      content: msg.content,
    };
    setMessages((prev) => [...prev, newMsg]);
  });

  connection.on('ReceiveTasks', (receivedTasks: ExtractedTask[]) => {
    console.log('[SignalR] Received tasks:', receivedTasks);
    if (receivedTasks?.length > 0) {
      setTasks(receivedTasks);
      const newMsg: MessageWithTasks = {
        id: `tasks-${uuidv4}`,
        role: 'assistant',
        content: 'Generated tasks',
        tasks:receivedTasks,
      };
      setMessages((prev) => [...prev, newMsg]);
    }
  });

  connection.on('ConversationCompleted', (convoId: string) => {
    console.log('[SignalR] Conversation completed for:', convoId);
    setIsConversationComplete(true);
  });

  connection.on('BotTyping', (isTyping: boolean) => {
    setIsBotTyping(isTyping);
  });
}
