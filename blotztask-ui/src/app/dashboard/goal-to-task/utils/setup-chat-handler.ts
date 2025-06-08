import { HubConnection, HubConnectionState } from '@microsoft/signalr';
import { Dispatch, SetStateAction } from 'react';
import { ExtractedTask } from '@/model/extracted-task-dto';
import { ConversationMessage } from '../models/chat-message';

export function setupChatHandlers(
  connection: HubConnection,
  setMessages: Dispatch<SetStateAction<ConversationMessage[]>>,
  setTasks: Dispatch<SetStateAction<ExtractedTask[]>>,
  setIsConversationComplete: Dispatch<SetStateAction<boolean>>,
  setConnectionState: Dispatch<SetStateAction<HubConnectionState>>,
  setShowTasks: Dispatch<SetStateAction<boolean>>,
  setIsBotTyping: Dispatch<SetStateAction<boolean>>
) {
  console.log('[SignalR] Connection started');
  setConnectionState(HubConnectionState.Connected);

  connection.on('ReceiveMessage', (msg: ConversationMessage) => {
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

  connection.on('ReceiveTasks', (receivedTasks: ExtractedTask[]) => {
    console.log('[SignalR] Received tasks:', receivedTasks);
    if (receivedTasks?.length > 0) {
      setTasks(receivedTasks);
      setShowTasks(true);
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
